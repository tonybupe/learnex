"""Tests for POST /api/v1/auth/register and /login."""
import pytest
from fastapi.testclient import TestClient

import uuid as _uuid
_uid = _uuid.uuid4().hex[:8]
REGISTER_PAYLOAD = {
    "full_name": "Tony Bupe",
    "email": f"tony_{_uid}@learnex.dev",
    "phone_number": f"+2609{_uid[:8]}",
    "sex": "male",
    "password": "Secure123",
    "role": "learner",
}


class TestRegister:
    def test_register_success(self, client: TestClient):
        resp = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == REGISTER_PAYLOAD["email"]
        assert body["full_name"] == REGISTER_PAYLOAD["full_name"]
        assert body["role"] == "learner"
        assert "password" not in body
        assert "password_hash" not in body

    def test_register_duplicate_email(self, client: TestClient):
        # Register once, then try again
        client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
        resp = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
        assert resp.status_code == 400
        assert "Email already registered" in resp.json()["detail"]

    def test_register_duplicate_phone(self, client: TestClient, registered_user):
        payload = REGISTER_PAYLOAD.copy()
        payload["email"] = "other@learnex.dev"
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 400
        assert "Phone number already registered" in resp.json()["detail"]

    def test_register_invalid_email(self, client: TestClient):
        payload = REGISTER_PAYLOAD.copy()
        payload["email"] = "not-an-email"
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_short_password(self, client: TestClient):
        payload = REGISTER_PAYLOAD.copy()
        payload["password"] = "123"
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_invalid_sex(self, client: TestClient):
        payload = REGISTER_PAYLOAD.copy()
        payload["sex"] = "unknown"
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_invalid_role(self, client: TestClient):
        payload = REGISTER_PAYLOAD.copy()
        payload["role"] = "superuser"
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_teacher_role(self, client: TestClient):
        import uuid as _u
        _x = _u.uuid4().hex[:8]
        payload = REGISTER_PAYLOAD.copy()
        payload["email"] = f"teacher_{_x}@learnex.dev"
        payload["phone_number"] = f"+2609{_x[:7]}"
        payload["role"] = "teacher"
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 201
        assert resp.json()["role"] == "teacher"


class TestLogin:
    def test_login_success(self, client: TestClient, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": REGISTER_PAYLOAD["password"],
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, registered_user):
        resp = client.post("/api/v1/auth/login", json={
            "email": REGISTER_PAYLOAD["email"],
            "password": "WrongPass",
        })
        assert resp.status_code == 401

    def test_login_unknown_email(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={
            "email": "nobody@learnex.dev",
            "password": "Secure123",
        })
        assert resp.status_code == 401

    def test_login_invalid_email_format(self, client: TestClient):
        resp = client.post("/api/v1/auth/login", json={
            "email": "not-an-email",
            "password": "Secure123",
        })
        assert resp.status_code == 422
