"""Tests for Lessons RBAC."""
import pytest
from fastapi.testclient import TestClient


class TestLessonsRBAC:

    def test_teacher_can_create_lesson_in_own_class(
        self, client: TestClient, teacher_token: str, teacher_class_id: int, subject_id: int
    ):
        res = client.post("/api/v1/lessons", json={
            "title": "Photosynthesis",
            "content": "## Introduction\nLeaf absorbs light.",
            "class_id": teacher_class_id,
            "subject_id": subject_id,
            "lesson_type": "note",
            "status": "published",
            "visibility": "class"
        }, headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["title"] == "Photosynthesis"

    def test_teacher_cannot_create_lesson_in_other_class(
        self, client: TestClient, other_teacher_token: str, teacher_class_id: int, subject_id: int
    ):
        res = client.post("/api/v1/lessons", json={
            "title": "Stolen Lesson",
            "content": "Content here.",
            "class_id": teacher_class_id,
            "subject_id": subject_id,
            "lesson_type": "note",
            "status": "published",
            "visibility": "class"
        }, headers={"Authorization": f"Bearer {other_teacher_token}"})
        assert res.status_code == 403
        assert "own classes" in res.json()["detail"]

    def test_learner_cannot_create_lesson(
        self, client: TestClient, learner_token: str, teacher_class_id: int, subject_id: int
    ):
        res = client.post("/api/v1/lessons", json={
            "title": "Learner Lesson",
            "content": "Content.",
            "class_id": teacher_class_id,
            "subject_id": subject_id,
            "lesson_type": "note",
            "status": "published",
            "visibility": "class"
        }, headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 403

    def test_teacher_can_update_own_lesson(
        self, client: TestClient, teacher_token: str, teacher_lesson_id: int
    ):
        res = client.patch(f"/api/v1/lessons/{teacher_lesson_id}",
                           json={"title": "Updated Title"},
                           headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        assert res.json()["title"] == "Updated Title"

    def test_teacher_cannot_update_others_lesson(
        self, client: TestClient, other_teacher_token: str, teacher_lesson_id: int
    ):
        res = client.patch(f"/api/v1/lessons/{teacher_lesson_id}",
                           json={"title": "Hacked Title"},
                           headers={"Authorization": f"Bearer {other_teacher_token}"})
        assert res.status_code == 403

    def test_teacher_can_delete_own_lesson(
        self, client: TestClient, teacher_token: str, teacher_class_id: int, subject_id: int
    ):
        # Create a lesson to delete
        create = client.post("/api/v1/lessons", json={
            "title": "To Delete",
            "content": "Content.",
            "class_id": teacher_class_id,
            "subject_id": subject_id,
            "lesson_type": "note",
            "status": "draft",
            "visibility": "class"
        }, headers={"Authorization": f"Bearer {teacher_token}"})
        lesson_id = create.json()["id"]
        res = client.delete(f"/api/v1/lessons/{lesson_id}",
                            headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200

    def test_list_lessons_returns_list(self, client: TestClient, teacher_token: str):
        res = client.get("/api/v1/lessons", headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_learner_only_sees_published_lessons(
        self, client: TestClient, learner_token: str, teacher_class_id: int
    ):
        # Join class first
        client.post(f"/api/v1/classes/{teacher_class_id}/join",
                    headers={"Authorization": f"Bearer {learner_token}"})
        res = client.get("/api/v1/lessons", headers={"Authorization": f"Bearer {learner_token}"})
        assert res.status_code == 200
        for lesson in res.json():
            assert lesson["status"] == "published"