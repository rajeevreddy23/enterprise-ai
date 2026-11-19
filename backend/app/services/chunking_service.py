import re
from typing import List
from dataclasses import dataclass
from app.services.document_processor import ExtractedSection
from app.core.config import settings


@dataclass
class ProcessedChunk:
    chunk_index: int
    page_number: int
    section_title: str
    content: str
    token_count: int


class ChunkingService:
    """
    Intelligent recursive character chunking with overlap, preserving
    page numbers, document structure, and heading context.
    """

    def __init__(
        self,
        chunk_size: int = settings.CHUNK_SIZE,
        chunk_overlap: int = settings.CHUNK_OVERLAP
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = ["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""]

    def chunk_sections(
        self,
        sections: List[ExtractedSection],
        doc_title: str = ""
    ) -> List[ProcessedChunk]:
        all_chunks: List[ProcessedChunk] = []
        global_index = 0

        for section in sections:
            section_chunks = self._split_text(section.content)
            for chunk_text in section_chunks:
                clean_chunk = chunk_text.strip()
                if not clean_chunk or len(clean_chunk) < 20:
                    continue
                
                # Approximate token count (1 token ≈ 4 characters)
                token_count = max(1, len(clean_chunk) // 4)
                
                all_chunks.append(ProcessedChunk(
                    chunk_index=global_index,
                    page_number=section.page_number,
                    section_title=section.section_title or doc_title,
                    content=clean_chunk,
                    token_count=token_count
                ))
                global_index += 1

        return all_chunks

    def _split_text(self, text: str) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text]

        return self._recursive_split(text, self.separators)

    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        final_chunks: List[str] = []
        separator = separators[-1]
        new_separators = []

        for i, sep in enumerate(separators):
            if sep == "":
                separator = sep
                break
            if sep in text:
                separator = sep
                new_separators = separators[i + 1:]
                break

        splits = text.split(separator) if separator != "" else list(text)

        good_splits: List[str] = []
        for s in splits:
            if len(s) < self.chunk_size:
                good_splits.append(s)
            else:
                if new_separators:
                    sub_splits = self._recursive_split(s, new_separators)
                    good_splits.extend(sub_splits)
                else:
                    # Hard split
                    for idx in range(0, len(s), self.chunk_size - self.chunk_overlap):
                        good_splits.append(s[idx: idx + self.chunk_size])

        # Merge splits with overlap
        merged: List[str] = []
        current_chunk: List[str] = []
        current_len = 0

        for s in good_splits:
            s_len = len(s) + (len(separator) if current_chunk else 0)
            if current_len + s_len > self.chunk_size and current_chunk:
                joined = separator.join(current_chunk)
                merged.append(joined)
                
                # Overlap: keep the tail elements
                overlap_accum: List[str] = []
                overlap_len = 0
                for item in reversed(current_chunk):
                    if overlap_len + len(item) <= self.chunk_overlap:
                        overlap_accum.insert(0, item)
                        overlap_len += len(item)
                    else:
                        break
                current_chunk = overlap_accum
                current_len = overlap_len

            current_chunk.append(s)
            current_len += len(s)

        if current_chunk:
            merged.append(separator.join(current_chunk))

        return merged
