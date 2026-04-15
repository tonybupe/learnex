"""Tests for Subjects RBAC."""
import uuid
import pytest
from fastapi.testclient import TestClient

def uid6() -> str:
    return uuid.uuid4().hex[:6].upper()

class TestSubjectsRBAC:

    def test_teacher_can_create_subject(self, client: TestClient, teacher_token: str):
        res = client.post("/api/v1/subjects", json={
            "name": f"Test Physics {uid6()}",
            "code": f"PH{uid6()}",
            "description": "Physics subject"
        }, headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "name" in data
        assert data["created_by"] is not None

    def test_learner_cannot_create_subject(self, client: TestClient, learner_token: str):
        res = client.post("/api/v1/subjects", json={
            "name": f"Learner Subject {uid6()}",
            "code": f"LR{uid6()}"
        }, headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 403

    def test_duplicate_subject_code_rejected(self, client: TestClient, teacher_token: str):
        code = f"DUP{uid6()}"
        client.post("/api/v1/subjects", json={"name": f"Dup Subject {uid6()}", "code": code},
                    headers={"Authorization": f"Bearer {teacher_token}"})
        res = client.post("/api/v1/subjects", json={"name": f"Dup Subject 2 {uid6()}", "code": code},
                          headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 400

    def test_list_subjects_authenticated(self, client: TestClient, learner_token: str):
        res = client.get("/api/v1/subjects", headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_teacher_can_edit_own_subject(self, client: TestClient, teacher_token: str):
        create = client.post("/api/v1/subjects",
            json={"name": f"Edit Me {uid6()}", "code": f"ED{uid6()}"},
            headers={"Authorization": f"Bearer {teacher_token}"})
        assert create.status_code == 200, f"Create failed: {create.text}"
        sid = create.json()["id"]
        res = client.patch(f"/api/v1/subjects/{sid}", json={"description": "Updated"},
                           headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200

    def test_teacher_cannot_edit_others_subject(
        self, client: TestClient, teacher_token: str, other_teacher_token: str
    ):
        create = client.post("/api/v1/subjects",
            json={"name": f"Mine Subject {uid6()}", "code": f"MI{uid6()}"},
            headers={"Authorization": f"Bearer {teacher_token}"})
        assert create.status_code == 200, f"Create failed: {create.text}"
        sid = create.json()["id"]
        res = client.patch(f"/api/v1/subjects/{sid}", json={"description": "Hacked"},
                           headers={"Authorization": f"Bearer {other_teacher_token}"})
        assert res.status_code == 403

    def test_teacher_cannot_delete_others_subject(
        self, client: TestClient, teacher_token: str, other_teacher_token: str
    ):
        create = client.post("/api/v1/subjects",
            json={"name": f"Del Subject {uid6()}", "code": f"DL{uid6()}"},
            headers={"Authorization": f"Bearer {teacher_token}"})
        assert create.status_code == 200, f"Create failed: {create.text}"
        sid = create.json()["id"]
        res = client.delete(f"/api/v1/subjects/{sid}",
                            headers={"Authorization": f"Bearer {other_teacher_token}"})
        assert res.status_code == 403