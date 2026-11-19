import logging
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
    FilterSelector
)
from app.core.config import settings

logger = logging.getLogger(__name__)

# Global singleton client to prevent multiple locks on local storage
_SHARED_CLIENT: Optional[QdrantClient] = None


def _get_or_create_client() -> QdrantClient:
    global _SHARED_CLIENT
    if _SHARED_CLIENT is not None:
        return _SHARED_CLIENT

    if settings.QDRANT_URL and len(settings.QDRANT_URL.strip()) > 0:
        logger.info(f"Connecting to remote Qdrant at {settings.QDRANT_URL}")
        _SHARED_CLIENT = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY
        )
    else:
        try:
            logger.info(f"Using embedded local Qdrant at {settings.QDRANT_STORAGE_PATH}")
            _SHARED_CLIENT = QdrantClient(path=settings.QDRANT_STORAGE_PATH)
        except Exception as e:
            logger.warning(f"Could not initialize local path Qdrant ({e}). Falling back to in-memory Qdrant.")
            _SHARED_CLIENT = QdrantClient(":memory:")

    return _SHARED_CLIENT


class VectorStoreService:
    """
    Manages vector storage and similarity retrieval via Qdrant.
    Guarantees strict organization data isolation and role-based permissions.
    """

    def __init__(self, client: Optional[QdrantClient] = None):
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self.client = client or _get_or_create_client()
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            exists = self.client.collection_exists(collection_name=self.collection_name)
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection '{self.collection_name}'")
        except Exception as e:
            logger.error(f"Error ensuring Qdrant collection: {e}")

    @staticmethod
    def _to_valid_uuid(raw_id: Any) -> str:
        s = str(raw_id or uuid.uuid4())
        try:
            return str(uuid.UUID(s))
        except ValueError:
            return str(uuid.uuid5(uuid.NAMESPACE_DNS, s))

    def upsert_chunks(self, chunks: List[Dict[str, Any]]) -> bool:
        if not chunks:
            return True

        points: List[PointStruct] = []
        for c in chunks:
            point_id = self._to_valid_uuid(c.get("chunk_id"))
            payload = {
                "chunk_id": point_id,
                "document_id": str(c["document_id"]),
                "organization_id": str(c["organization_id"]),
                "document_title": c.get("document_title", ""),
                "page_number": c.get("page_number", 1),
                "section_title": c.get("section_title", ""),
                "content": c.get("content", ""),
                "category": c.get("category", "General"),
                "access_level": c.get("access_level", "PUBLIC"),
                "allowed_roles": c.get("allowed_roles", ["Admin", "Manager", "Employee"]),
                "uploader_id": str(c.get("uploader_id", "")),
            }
            points.append(PointStruct(
                id=point_id,
                vector=c["vector"],
                payload=payload
            ))

        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            return True
        except Exception as e:
            logger.error(f"Failed to upsert points into Qdrant: {e}")
            raise

    def search_vectors(
        self,
        query_vector: List[float],
        organization_id: str,
        user_role: str,
        user_id: str,
        category: Optional[str] = None,
        document_id: Optional[str] = None,
        limit: int = 10,
        score_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Search vectors with enforced multi-tenant organization isolation
        and document-level access permissions.
        """
        # Base filter: mandatory organization isolation
        must_conditions: List[Any] = [
            FieldCondition(
                key="organization_id",
                match=MatchValue(value=str(organization_id))
            )
        ]

        if category and category.lower() != "all":
            must_conditions.append(
                FieldCondition(key="category", match=MatchValue(value=category))
            )

        if document_id:
            must_conditions.append(
                FieldCondition(key="document_id", match=MatchValue(value=str(document_id)))
            )

        # RBAC and Document Access:
        # Admins can access all documents within their organization
        if user_role.lower() != "admin":
            should_conditions = [
                FieldCondition(key="access_level", match=MatchValue(value="PUBLIC")),
                FieldCondition(key="allowed_roles", match=MatchAny(any=[user_role])),
                FieldCondition(key="uploader_id", match=MatchValue(value=str(user_id))),
            ]
            query_filter = Filter(must=must_conditions, should=should_conditions)
        else:
            query_filter = Filter(must=must_conditions)

        try:
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=limit,
                score_threshold=score_threshold
            ).points

            output: List[Dict[str, Any]] = []
            for hit in results:
                p = hit.payload or {}
                output.append({
                    "chunk_id": str(hit.id),
                    "score": float(hit.score),
                    "document_id": p.get("document_id"),
                    "document_title": p.get("document_title"),
                    "page_number": p.get("page_number", 1),
                    "section_title": p.get("section_title", ""),
                    "content": p.get("content", ""),
                    "category": p.get("category", "General"),
                    "access_level": p.get("access_level", "PUBLIC"),
                })
            return output
        except Exception as e:
            logger.error(f"Error querying Qdrant: {e}")
            return []

    def delete_document_vectors(self, document_id: str, organization_id: str) -> bool:
        """
        Strictly purge all vectors belonging to a document within an organization.
        """
        try:
            doc_filter = Filter(
                must=[
                    FieldCondition(key="document_id", match=MatchValue(value=str(document_id))),
                    FieldCondition(key="organization_id", match=MatchValue(value=str(organization_id)))
                ]
            )
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=FilterSelector(filter=doc_filter)
            )
            return True
        except Exception as e:
            logger.error(f"Failed to delete document vectors from Qdrant: {e}")
            return False

    def get_collection_stats(self) -> Dict[str, Any]:
        try:
            info = self.client.get_collection(collection_name=self.collection_name)
            return {
                "collection_name": self.collection_name,
                "vectors_count": getattr(info, "vectors_count", getattr(info, "points_count", 0)),
                "status": getattr(info, "status", "ready")
            }
        except Exception as e:
            return {"error": str(e), "collection_name": self.collection_name}
