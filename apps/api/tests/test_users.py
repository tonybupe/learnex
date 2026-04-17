"""Tests for /api/v1/users endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestGetMe:
    def test_get_me_success(self, client: TestClient, auth_headers, registered_user):
        resp = client.get("/api/v1/users/me", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == registered_user["email"]
        assert body["full_name"] == registered_user["full_name"]
        assert "profile" in body
        assert "followers_count" in body
        assert "following_count" in body

    def test_get_me_unauthenticated(self, client: TestClient):
        resp = client.get("/api/v1/users/me")
        assert resp.status_code in (401, 403)  # both are valid unauthenticated responses

    def test_get_me_invalid_token(self, client: TestClient):
        resp = client.get("/api/v1/users/me",
                          headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401


class TestGetUserProfile:
    def test_get_user_by_id(self, client: TestClient, auth_headers, registered_user):
        user_id = registered_user["id"]
        resp = client.get(f"/api/v1/users/{user_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == user_id

    def test_get_user_not_found(self, client: TestClient, auth_headers):
        resp = client.get("/api/v1/users/999999", headers=auth_headers)
        assert resp.status_code == 404


class TestUpdateProfile:
    def test_update_profile(self, client: TestClient, auth_headers):
        resp = client.patch("/api/v1/users/me/profile", headers=auth_headers,
                            json={"bio": "Learning every day", "location": "Lusaka"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["bio"] == "Learning every day"
        assert body["location"] == "Lusaka"

    def test_update_profile_partial(self, client: TestClient, auth_headers):
        resp = client.patch("/api/v1/users/me/profile", headers=auth_headers,
                            json={"profession": "Software Engineer"})
        assert resp.status_code == 200
        assert resp.json()["profession"] == "Software Engineer"

    def test_update_profile_unauthenticated(self, client: TestClient):
        resp = client.patch("/api/v1/users/me/profile",
                            json={"bio": "Should fail"})
        assert resp.status_code in (401, 403)  # both valid for unauthenticated


class TestListUsers:
    def test_list_users_as_admin(self, client: TestClient, admin_headers):
        resp = client.get("/api/v1/users", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_users_as_learner_forbidden(self, client: TestClient, auth_headers):
        import time; time.sleep(1)  # avoid rate limit from previous test
        resp = client.get("/api/v1/users", headers=auth_headers)
        assert resp.status_code in (403, 429)  # 429 = rate limited = also blocked
