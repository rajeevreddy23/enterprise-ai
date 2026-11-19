import hashlib
import math
import numpy as np
from typing import List, Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Enterprise embedding service. Uses Google Gemini API (text-embedding-004)
    when GEMINI_API_KEY is configured, with a high-fidelity deterministic
    768-dimensional fallback for offline development & tests.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_EMBEDDING_MODEL
        self.dim = settings.EMBEDDING_DIMENSION
        self._is_gemini_active = False

        if self.api_key and len(self.api_key.strip()) > 10:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._is_gemini_active = True
                logger.info("Initialized Gemini Embedding API with key.")
            except Exception as e:
                logger.warning(f"Failed to configure Gemini Embedding API: {e}")
                self._is_gemini_active = False

    def is_live_gemini(self) -> bool:
        return self._is_gemini_active

    def embed_text(self, text: str, is_query: bool = False) -> List[float]:
        return self.embed_batch([text], is_query=is_query)[0]

    def embed_batch(self, texts: List[str], is_query: bool = False) -> List[List[float]]:
        if not texts:
            return []

        if self._is_gemini_active:
            try:
                import google.generativeai as genai
                task = "retrieval_query" if is_query else "retrieval_document"
                # Batch embed via Gemini
                embeddings: List[List[float]] = []
                # Process in batches of 16 to respect payload sizes
                batch_size = 16
                for i in range(0, len(texts), batch_size):
                    batch = texts[i : i + batch_size]
                    result = genai.embed_content(
                        model=self.model,
                        content=batch,
                        task_type=task
                    )
                    if isinstance(result, dict) and "embedding" in result:
                        raw = result["embedding"]
                        if isinstance(raw[0], list):
                            embeddings.extend(raw)
                        else:
                            embeddings.append(raw)
                    else:
                        raise ValueError("Unexpected format from Gemini embed_content")

                if len(embeddings) == len(texts):
                    return embeddings
            except Exception as e:
                logger.error(f"Gemini embedding API call failed: {e}. Falling back to deterministic vectorizer.")

        # Fallback: High-dimensional deterministic word & semantic projection
        return [self._deterministic_semantic_vector(t) for t in texts]

    def _deterministic_semantic_vector(self, text: str) -> List[float]:
        """
        Creates a reproducible 768-dimensional normalized unit vector
        using feature hashing of words and character n-grams.
        Preserves cosine similarity between semantically overlapping texts.
        """
        vec = np.zeros(self.dim, dtype=np.float32)
        words = text.lower().split()
        
        for w in words:
            # Word level hash
            h_val = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
            idx = h_val % self.dim
            sign = 1.0 if (h_val % 2 == 0) else -1.0
            vec[idx] += sign

            # Character 3-gram hash
            for i in range(max(0, len(w) - 2)):
                tri = w[i : i + 3]
                h_tri = int(hashlib.sha256(tri.encode("utf-8")).hexdigest(), 16)
                idx_tri = h_tri % self.dim
                sign_tri = 1.0 if (h_tri % 2 == 0) else -1.0
                vec[idx_tri] += 0.5 * sign_tri

        # Normalize to unit vector
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec = vec / norm
        else:
            # Random baseline if string was empty
            vec[0] = 1.0

        return vec.tolist()
