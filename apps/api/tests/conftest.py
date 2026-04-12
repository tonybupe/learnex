"""
Shared pytest fixtures for all tests.
Uses a separate test database and overrides the get_db dependency.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db

# ── Test database (SQLite in-memory for speed) ────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once before tests, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db():
    """Fresh DB session per test, rolled back after."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db):
    """Test client with DB override."""
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Reusable test data ────────────────────────────────────────────────────────

REGISTER_PAYLOAD = {
    "full_name": "Tony Bupe",
    "email": "tony@learnex.dev",
    "phone_number": "+260971234567",
    "sex": "male",
    "password": "Secure123",
    "role": "learner",
}

ADMIN_PAYLOAD = {
    "full_name": "Admin User",
    "email": "admin@learnex.dev",
    "phone_number": "+260971234568",
    "sex": "male",
    "password": "Secure123",
    "role": "admin",
}


@pytest.fixture
def registered_user(client):
    """Register and return a learner user."""
    resp = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def auth_headers(client, registered_user):
    """Log in and return Authorization headers."""
    resp = client.post("/api/v1/auth/login", json={
        "email": REGISTER_PAYLOAD["email"],
        "password": REGISTER_PAYLOAD["password"],
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(client):
    """Register and return an admin user."""
    resp = client.post("/api/v1/auth/register", json=ADMIN_PAYLOAD)
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def admin_headers(client, admin_user):
    """Log in as admin and return Authorization headers."""
    resp = client.post("/api/v1/auth/login", json={
        "email": ADMIN_PAYLOAD["email"],
        "password": ADMIN_PAYLOAD["password"],
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
