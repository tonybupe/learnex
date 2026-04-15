"""Tests for Subjects RBAC."""
import pytest
from fastapi.testclient import TestClient


class TestSubjectsRBAC:

    def test_teacher_can_create_subject(self, client: TestClient, teacher_token: str):
        res = client.post("/api/v1/subjects", json={
            "name": "Test Physics",
            "code": "PHYS999",
            "description": "Physics subject"
        }, headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Test Physics"
        assert data["code"] == "PHYS999"

    def test_learner_cannot_create_subject(self, client: TestClient, learner_token: str):
        res = client.post("/api/v1/subjects", json={
            "name": "Learner Subject",
            "code": "LRNS01"
        }, headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 403

    def test_duplicate_subject_code_rejected(self, client: TestClient, teacher_token: str):
        client.post("/api/v1/subjects", json={"name": "Dup Subject", "code": "DUP001"},
                    headers={"Authorization": f"Bearer {teacher_token}"})
        res = client.post("/api/v1/subjects", json={"name": "Dup Subject 2", "code": "DUP001"},
                          headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 400

    def test_list_subjects_authenticated(self, client: TestClient, learner_token: str):
        res = client.get("/api/v1/subjects", headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_teacher_can_edit_own_subject(self, client: TestClient, teacher_token: str):
        create = client.post("/api/v1/subjects", json={"name": "Edit Me", "code": "EDIT01"},
                             headers={"Authorization": f"Bearer {teacher_token}"})
        sid = create.json()["id"]
        res = client.patch(f"/api/v1/subjects/{sid}", json={"description": "Updated"},
                           headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200

    def test_teacher_cannot_edit_others_subject(
        self, client: TestClient, teacher_token: str, other_teacher_token: str
    ):
        create = client.post("/api/v1/subjects", json={"name": "Mine Subject", "code": "MINE01"},
                             headers={"Authorization": f"Bearer {teacher_token}"})
        sid = create.json()["id"]
        res = client.patch(f"/api/v1/subjects/{sid}", json={"description": "Hacked"},
                           headers={"Authorization": f"Bearer {other_teacher_token}"})
        assert res.status_code == 403

    def test_teacher_cannot_delete_others_subject(
        self, client: TestClient, teacher_token: str, other_teacher_token: str
    ):
        create = client.post("/api/v1/subjects", json={"name": "Del Subject", "code": "DEL001"},
                             headers={"Authorization": f"Bearer {teacher_token}"})
        sid = create.json()["id"]
        res = client.delete(f"/api/v1/subjects/{sid}",
                            headers={"Authorization": f"Bearer {other_teacher_token}"})
        assert res.status_code == 403