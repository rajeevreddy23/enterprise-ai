import pytest
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService
from app.services.rag_service import AdvancedRAGService


def test_embedding_dimensions():
    svc = EmbeddingService()
    vec = svc.embed_text("Enterprise AI Knowledge Assistant", is_query=True)
    assert len(vec) == 768
    # Test batch
    batch_vecs = svc.embed_batch(["Query 1", "Query 2"])
    assert len(batch_vecs) == 2
    assert len(batch_vecs[0]) == 768


def test_vector_store_organization_isolation():
    vec_store = VectorStoreService()
    embed_svc = EmbeddingService()

    org_a = "org-alpha-111"
    org_b = "org-beta-222"

    v_a = embed_svc.embed_text("Confidential financial report of Organization Alpha.")
    v_b = embed_svc.embed_text("Confidential marketing roadmap of Organization Beta.")

    # Upsert into Org A and Org B
    vec_store.upsert_chunks([
        {
            "chunk_id": "chunk-a-1",
            "document_id": "doc-a",
            "organization_id": org_a,
            "document_title": "Alpha Financials",
            "page_number": 1,
            "section_title": "Q3 Revenue",
            "content": "Revenue grew by 45% in Q3 for Alpha.",
            "access_level": "PUBLIC",
            "allowed_roles": ["Admin", "Manager", "Employee"],
            "uploader_id": "user-a",
            "vector": v_a
        },
        {
            "chunk_id": "chunk-b-1",
            "document_id": "doc-b",
            "organization_id": org_b,
            "document_title": "Beta Roadmap",
            "page_number": 1,
            "section_title": "Product Launch",
            "content": "Beta will launch Product X in December.",
            "access_level": "PUBLIC",
            "allowed_roles": ["Admin", "Manager", "Employee"],
            "uploader_id": "user-b",
            "vector": v_b
        }
    ])

    # Search as Org A: MUST NOT see Org B results!
    q_vec = embed_svc.embed_text("Product launch in December", is_query=True)
    res_a = vec_store.search_vectors(
        query_vector=q_vec,
        organization_id=org_a,
        user_role="Employee",
        user_id="user-a",
        limit=5
    )

    doc_ids_a = [r["document_id"] for r in res_a]
    assert "doc-b" not in doc_ids_a  # Multi-tenant isolation verified!


def test_document_level_rbac_access_control():
    vec_store = VectorStoreService()
    embed_svc = EmbeddingService()

    org_id = "org-corp-333"
    v = embed_svc.embed_text("Executive salaries and bonuses overview.")

    # Restricted document only for Admins
    vec_store.upsert_chunks([
        {
            "chunk_id": "chunk-exec-1",
            "document_id": "doc-exec",
            "organization_id": org_id,
            "document_title": "Executive Compensation",
            "page_number": 1,
            "section_title": "C-Suite Bonuses",
            "content": "Executive bonus allocations are strictly confidential.",
            "access_level": "ROLE_RESTRICTED",
            "allowed_roles": ["Admin"],
            "uploader_id": "admin-1",
            "vector": v
        }
    ])

    # Employee searches: MUST NOT retrieve restricted chunk
    res_employee = vec_store.search_vectors(
        query_vector=v,
        organization_id=org_id,
        user_role="Employee",
        user_id="emp-1",
        limit=5
    )
    assert not any(r["document_id"] == "doc-exec" for r in res_employee)

    # Admin searches: CAN retrieve restricted chunk
    res_admin = vec_store.search_vectors(
        query_vector=v,
        organization_id=org_id,
        user_role="Admin",
        user_id="admin-1",
        limit=5
    )
    assert any(r["document_id"] == "doc-exec" for r in res_admin)


@pytest.mark.asyncio
async def test_full_rag_pipeline_execution():
    embed_svc = EmbeddingService()
    vec_store = VectorStoreService()
    rag_svc = AdvancedRAGService(embed_svc, vec_store)

    org_id = "org-test-rag"
    content = "The enterprise remote work policy mandates 3 days in office and 2 days remote."
    vec = embed_svc.embed_text(content)

    vec_store.upsert_chunks([
        {
            "chunk_id": "chunk-remote-1",
            "document_id": "doc-remote",
            "organization_id": org_id,
            "document_title": "Remote Work Guidelines 2025",
            "page_number": 3,
            "section_title": "Office Attendance",
            "content": content,
            "access_level": "PUBLIC",
            "allowed_roles": ["Admin", "Manager", "Employee"],
            "uploader_id": "admin-1",
            "vector": vec
        }
    ])

    result = await rag_svc.answer_question(
        query="What is the remote work policy?",
        organization_id=org_id,
        user_role="Employee",
        user_id="emp-1"
    )

    assert "answer" in result
    assert len(result["citations"]) > 0
    assert result["citations"][0]["document_title"] == "Remote Work Guidelines 2025"
    assert result["citations"][0]["page_number"] == 3
    assert result["verified"] is True
