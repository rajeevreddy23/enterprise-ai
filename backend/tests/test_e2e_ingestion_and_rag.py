import os
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db


@pytest.mark.asyncio
async def test_e2e_document_upload_and_rag_chat():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login as Admin
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@enterprise.ai", "password": "Admin@123456"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Upload sample Employee Handbook (.txt)
        sample_path = os.path.abspath("../samples/Employee_Handbook_2025.txt")
        if not os.path.exists(sample_path):
            sample_path = os.path.abspath("samples/Employee_Handbook_2025.txt")

        with open(sample_path, "rb") as f:
            upload_res = await client.post(
                "/api/v1/documents/upload",
                headers=headers,
                data={
                    "title": "Employee Handbook 2025",
                    "category": "HR",
                    "tags": "handbook,leave,policy",
                    "access_level": "PUBLIC",
                    "allowed_roles": "Admin,Manager,Employee"
                },
                files={"file": ("Employee_Handbook_2025.txt", f, "text/plain")}
            )

        assert upload_res.status_code == 200
        doc_data = upload_res.json()
        assert doc_data["status"] == "READY"
        assert doc_data["chunk_count"] > 0
        doc_id = doc_data["id"]

        # 3. Test Document Listing
        list_res = await client.get("/api/v1/documents/", headers=headers)
        assert list_res.status_code == 200
        items = list_res.json()["items"]
        assert any(d["id"] == doc_id for d in items)

        # 4. Test Search Explorer on uploaded document
        search_res = await client.post(
            "/api/v1/search/",
            headers=headers,
            json={
                "query": "annual paid leave and vacation",
                "search_type": "HYBRID",
                "limit": 5
            }
        )
        assert search_res.status_code == 200
        s_data = search_res.json()
        assert s_data["total_results"] > 0
        assert "leave" in s_data["results"][0]["content"].lower()

        # 5. Test AI Chat Workspace Question Answering with Citations
        chat_res = await client.post(
            "/api/v1/chat/message",
            headers=headers,
            json={
                "message": "How many days of annual paid leave do employees receive per year?"
            }
        )
        assert chat_res.status_code == 200
        c_data = chat_res.json()
        assert len(c_data["content"]) > 0
        assert len(c_data["citations"]) > 0
        assert c_data["citations"][0]["document_title"] == "Employee Handbook 2025"

        # 6. Test Analytics Endpoint reflects real counts
        analytics_res = await client.get("/api/v1/analytics/", headers=headers)
        assert analytics_res.status_code == 200
        ana = analytics_res.json()
        assert ana["total_documents"] >= 1
        assert ana["total_processed_documents"] >= 1
        assert ana["total_questions_asked"] >= 1
