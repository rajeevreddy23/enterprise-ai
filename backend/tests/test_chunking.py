from app.services.document_processor import DocumentProcessor, ExtractedSection
from app.services.chunking_service import ChunkingService


def test_document_processor_cleaning():
    raw_text = "This is  a   test    text.\r\n\r\n\r\n\r\nWith   multiple   spaces  and  newlines."
    cleaned = DocumentProcessor.clean_text(raw_text)
    assert "  " not in cleaned
    assert "\r" not in cleaned
    assert "\n\n\n" not in cleaned


def test_chunking_service_overlap_and_metadata():
    chunker = ChunkingService(chunk_size=120, chunk_overlap=30)
    sections = [
        ExtractedSection(
            page_number=1,
            section_title="Leave Entitlement",
            content="Employees receive 20 days paid annual leave each calendar year. Leave must be approved by the reporting manager in the HR portal."
        ),
        ExtractedSection(
            page_number=2,
            section_title="Sick Leave",
            content="Employees are entitled to 10 days of paid medical leave upon submission of a certified medical practitioner certificate."
        )
    ]

    chunks = chunker.chunk_sections(sections, doc_title="Employee Handbook")
    assert len(chunks) >= 2
    assert chunks[0].page_number == 1
    assert "Leave Entitlement" in chunks[0].section_title
    assert chunks[0].token_count > 0
