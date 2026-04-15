"""Tests for Classes RBAC and functionality."""
import pytest
from fastapi.testclient import TestClient


class TestClassesRBAC:
    """Test class ownership and RBAC."""

    def test_teacher_can_create_class(self, client: TestClient, teacher_token: str, subject_id: int):
        res = client.post("/api/v1/classes", json={
            "title": "Test Math Class",
            "class_code": "MATH101",
            "subject_id": subject_id,
            "visibility": "public",
            "grade_level": "Grade 10"
        }, headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["title"] == "Test Math Class"
        assert data["class_code"] == "MATH101"

    def test_learner_cannot_create_class(self, client: TestClient, learner_token: str, subject_id: int):
        res = client.post("/api/v1/classes", json={
            "title": "Learner Class",
            "class_code": "LEARN01",
            "subject_id": subject_id,
            "visibility": "public"
        }, headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 403

    def test_teacher_sees_own_classes_with_mine(self, client: TestClient, teacher_token: str, teacher_class_id: int):
        res = client.get("/api/v1/classes?mine=true", headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        ids = [c["id"] for c in data]
        assert teacher_class_id in ids

    def test_teacher_cannot_delete_other_class(self, client: TestClient, other_teacher_token: str, teacher_class_id: int):
        res = client.delete(f"/api/v1/classes/{teacher_class_id}",
                            headers={"Authorization": f"Bearer {other_teacher_token}"})
        assert res.status_code == 403

    def test_learner_can_join_class(self, client: TestClient, learner_token: str, teacher_class_id: int):
        res = client.post(f"/api/v1/classes/{teacher_class_id}/join",
                          headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 200

    def test_learner_cannot_join_twice(self, client: TestClient, learner_token: str, teacher_class_id: int):
        # First join
        client.post(f"/api/v1/classes/{teacher_class_id}/join",
                    headers={"Authorization": f"Bearer {learner_token}"})
        # Second join should fail
        res = client.post(f"/api/v1/classes/{teacher_class_id}/join",
                          headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 400
        assert "already" in res.json()["detail"].lower()

    def test_teacher_cannot_join_class(self, client: TestClient, teacher_token: str, teacher_class_id: int):
        res = client.post(f"/api/v1/classes/{teacher_class_id}/join",
                          headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 403

    def test_enrolled_endpoint_for_learner(self, client: TestClient, learner_token: str, teacher_class_id: int):
        # Join first
        client.post(f"/api/v1/classes/{teacher_class_id}/join",
                    headers={"Authorization": f"Bearer {learner_token}"})
        res = client.get("/api/v1/classes/enrolled",
                         headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 200
        ids = [c["id"] for c in res.json()]
        assert teacher_class_id in ids

    def test_unauthenticated_cannot_list_classes(self, client: TestClient):
        res = client.get("/api/v1/classes")
        assert res.status_code == 401