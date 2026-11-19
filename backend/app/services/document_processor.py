import os
import re
from typing import List, Dict, Any
from dataclasses import dataclass
import fitz  # PyMuPDF
import docx
import pandas as pd


@dataclass
class ExtractedSection:
    page_number: int
    section_title: str
    content: str


class DocumentProcessor:
    """
    Extracts text, preserves page numbers, headings, tables,
    and cleans text for enterprise RAG ingestion.
    """

    @classmethod
    def clean_text(cls, text: str) -> str:
        if not text:
            return ""
        # Normalize non-breaking spaces and irregular whitespace
        text = text.replace("\xa0", " ").replace("\r\n", "\n").replace("\r", "\n")
        # Remove consecutive duplicate whitespace while keeping single newlines
        text = re.sub(r"[ \t]+", " ", text)
        # Collapse excessive newlines (more than 2 consecutive newlines)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @classmethod
    def extract(cls, file_path: str, file_type: str) -> List[ExtractedSection]:
        ext = file_type.lower()
        if not ext.startswith("."):
            ext = f".{ext}"

        if ext == ".pdf":
            return cls._extract_pdf(file_path)
        elif ext == ".docx":
            return cls._extract_docx(file_path)
        elif ext in [".txt", ".text", ".md"]:
            return cls._extract_txt(file_path)
        elif ext == ".csv":
            return cls._extract_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            return cls._extract_excel(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    @classmethod
    def _extract_pdf(cls, file_path: str) -> List[ExtractedSection]:
        sections: List[ExtractedSection] = []
        doc = fitz.open(file_path)
        try:
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_num = page_idx + 1
                text = page.get_text("text")
                cleaned = cls.clean_text(text)
                if cleaned:
                    # Detect first line as possible heading
                    lines = cleaned.split("\n")
                    section_title = lines[0][:80] if lines else f"Page {page_num}"
                    sections.append(ExtractedSection(
                        page_number=page_num,
                        section_title=section_title,
                        content=cleaned
                    ))
        finally:
            doc.close()
        return sections

    @classmethod
    def _extract_docx(cls, file_path: str) -> List[ExtractedSection]:
        sections: List[ExtractedSection] = []
        doc = docx.Document(file_path)
        
        current_heading = "Overview"
        current_paragraphs: List[str] = []
        page_estimate = 1
        char_count = 0

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            # Check for heading style
            if para.style.name.startswith("Heading"):
                if current_paragraphs:
                    content = cls.clean_text("\n".join(current_paragraphs))
                    if content:
                        sections.append(ExtractedSection(
                            page_number=page_estimate,
                            section_title=current_heading,
                            content=content
                        ))
                    current_paragraphs = []
                current_heading = text[:80]
            else:
                current_paragraphs.append(text)
                char_count += len(text)
                if char_count > 2500:  # approximate page boundary
                    page_estimate += 1
                    char_count = 0

        # Handle any tables in DOCX
        for table in doc.tables:
            table_rows = []
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells]
                table_rows.append(" | ".join(cells))
            if table_rows:
                current_paragraphs.append("\nTable Data:\n" + "\n".join(table_rows))

        if current_paragraphs:
            content = cls.clean_text("\n".join(current_paragraphs))
            if content:
                sections.append(ExtractedSection(
                    page_number=page_estimate,
                    section_title=current_heading,
                    content=content
                ))

        return sections

    @classmethod
    def _extract_txt(cls, file_path: str) -> List[ExtractedSection]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        cleaned = cls.clean_text(content)
        # Split into ~2000 character logical pages
        paragraphs = cleaned.split("\n\n")
        sections: List[ExtractedSection] = []
        page_num = 1
        curr_page_paras: List[str] = []
        curr_chars = 0

        for para in paragraphs:
            curr_page_paras.append(para)
            curr_chars += len(para)
            if curr_chars >= 2000:
                text_block = "\n\n".join(curr_page_paras)
                title = curr_page_paras[0][:60]
                sections.append(ExtractedSection(
                    page_number=page_num,
                    section_title=title,
                    content=text_block
                ))
                curr_page_paras = []
                curr_chars = 0
                page_num += 1

        if curr_page_paras:
            text_block = "\n\n".join(curr_page_paras)
            title = curr_page_paras[0][:60]
            sections.append(ExtractedSection(
                page_number=page_num,
                section_title=title,
                content=text_block
            ))

        return sections

    @classmethod
    def _extract_csv(cls, file_path: str) -> List[ExtractedSection]:
        df = pd.read_csv(file_path, nrows=5000)
        sections: List[ExtractedSection] = []
        
        # Batch rows into chunks
        rows_per_section = 50
        total_rows = len(df)
        
        for i in range(0, total_rows, rows_per_section):
            batch = df.iloc[i : i + rows_per_section]
            markdown_table = batch.to_markdown(index=False)
            page_num = (i // rows_per_section) + 1
            sections.append(ExtractedSection(
                page_number=page_num,
                section_title=f"Rows {i+1} to {min(i+rows_per_section, total_rows)}",
                content=markdown_table
            ))

        return sections

    @classmethod
    def _extract_excel(cls, file_path: str) -> List[ExtractedSection]:
        sections: List[ExtractedSection] = []
        xl = pd.ExcelFile(file_path)
        page_counter = 1

        for sheet_name in xl.sheet_names:
            df = xl.parse(sheet_name, nrows=2000)
            if df.empty:
                continue
            rows_per_section = 40
            for i in range(0, len(df), rows_per_section):
                batch = df.iloc[i : i + rows_per_section]
                table_md = batch.to_markdown(index=False)
                sections.append(ExtractedSection(
                    page_number=page_counter,
                    section_title=f"Sheet: {sheet_name} (Rows {i+1}-{min(i+rows_per_section, len(df))})",
                    content=f"### Sheet: {sheet_name}\n\n{table_md}"
                ))
                page_counter += 1

        return sections
