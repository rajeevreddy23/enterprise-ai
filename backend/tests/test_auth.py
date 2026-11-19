import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db


@pytest.mark.asyncio
async def test_auth_flow():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login with seeded admin
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@enterprise.ai", "password": "Admin@123456"}
        )
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Admin"
        token = data["access_token"]

        # 2. Get /me with valid token
        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "admin@enterprise.ai"

        # 3. Test invalid password
        bad_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@enterprise.ai", "password": "WrongPassword"}
        )
        assert bad_login.status_code == 401
