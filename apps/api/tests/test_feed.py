"""Tests for Feed endpoints."""
import pytest
from fastapi.testclient import TestClient


class TestFeedEndpoints:

    def test_latest_feed(self, client: TestClient, teacher_token: str):
        res = client.get("/api/v1/feed/latest",
                         headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_popular_feed(self, client: TestClient, teacher_token: str):
        res = client.get("/api/v1/feed/popular",
                         headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_trending_feed(self, client: TestClient, teacher_token: str):
        res = client.get("/api/v1/feed/trending",
                         headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_following_feed(self, client: TestClient, learner_token: str):
        res = client.get("/api/v1/feed/following",
                         headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_classes_feed(self, client: TestClient, learner_token: str):
        res = client.get("/api/v1/feed/classes",
                         headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_feed_requires_auth(self, client: TestClient):
        for mode in ["latest", "popular", "trending", "following", "classes"]:
            res = client.get(f"/api/v1/feed/{mode}")
            assert res.status_code == 401, f"{mode} should require auth"

    def test_feed_pagination(self, client: TestClient, teacher_token: str):
        res = client.get("/api/v1/feed/latest?page=1&limit=5",
                         headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        assert len(res.json()) <= 5

    def test_feed_invalid_page(self, client: TestClient, teacher_token: str):
        res = client.get("/api/v1/feed/latest?page=0",
                         headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 422