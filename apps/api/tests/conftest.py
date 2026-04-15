"""Shared test fixtures for Learnex API tests."""
import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

def register_and_login(client: TestClient, role: str, suffix: str = "") -> str:
    uid = suffix or uuid.uuid4().hex[:8]
    email = f"{role}_{uid}@test.learnex.com"
    phone = f"09{uid[:8]}"
    client.post("/api/v1/auth/register", json={
        "full_name": f"Test {role.title()} {uid}",
        "email": email,
        "password": "Test1234!",
        "phone_number": phone,
        "sex": "male",
        "role": role,
    })
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def registered_user(client: TestClient):
    """Register a learner and return their credentials. Used by test_auth.py."""
    from tests.test_auth import REGISTER_PAYLOAD
    # Try to register (may already exist)
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    return REGISTER_PAYLOAD

@pytest.fixture(scope="session")
def teacher_token(client: TestClient) -> str:
    return register_and_login(client, "teacher")

@pytest.fixture(scope="session")
def other_teacher_token(client: TestClient) -> str:
    return register_and_login(client, "teacher")

@pytest.fixture(scope="session")
def learner_token(client: TestClient) -> str:
    return register_and_login(client, "learner")

@pytest.fixture(scope="session")
def admin_token(client: TestClient) -> str:
    res = client.post("/api/v1/auth/login", json={
        "email": "nthnbupe@gmail.com", "password": "bupe1407"
    })
    if res.status_code == 200:
        return res.json()["access_token"]
    return register_and_login(client, "teacher")

@pytest.fixture(scope="session")
def subject_id(client: TestClient, teacher_token: str) -> int:
    uid = uuid.uuid4().hex[:6].upper()
    res = client.post("/api/v1/subjects", json={
        "name": f"Test Subject {uid}",
        "code": f"TST{uid}",
        "description": "Test subject for fixtures"
    }, headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 200, f"Subject creation failed: {res.text}"
    return res.json()["id"]

@pytest.fixture(scope="session")
def teacher_class_id(client: TestClient, teacher_token: str, subject_id: int) -> int:
    uid = uuid.uuid4().hex[:6].upper()
    res = client.post("/api/v1/classes", json={
        "title": f"Test Class {uid}",
        "class_code": f"CLS{uid}",
        "subject_id": subject_id,
        "visibility": "public",
        "grade_level": "Grade 10"
    }, headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 200, f"Class creation failed: {res.text}"
    return res.json()["id"]

@pytest.fixture(scope="session")
def teacher_lesson_id(client: TestClient, teacher_token: str, teacher_class_id: int, subject_id: int) -> int:
    res = client.post("/api/v1/lessons", json={
        "title": "Fixture Lesson",
        "content": "## Introduction\nTest content for fixtures.",
        "class_id": teacher_class_id,
        "subject_id": subject_id,
        "lesson_type": "note",
        "status": "published",
        "visibility": "class"
    }, headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 200, f"Lesson creation failed: {res.text}"
    return res.json()["id"]