"""Tests for file upload endpoint."""
import pytest
import io
from fastapi.testclient import TestClient


class TestUploads:

    def test_image_upload_requires_auth(self, client: TestClient):
        res = client.post("/api/v1/uploads/image")
        assert res.status_code == 401

    def test_image_upload_valid(self, client: TestClient, teacher_token: str):
        # Create a minimal valid PNG (1x1 pixel)
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
            b"\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18"
            b"\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        res = client.post("/api/v1/uploads/image", files=files,
                          headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "url" in data
        assert data["url"].startswith("/uploads")

    def test_non_image_rejected(self, client: TestClient, teacher_token: str):
        files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
        res = client.post("/api/v1/uploads/image", files=files,
                          headers={"Authorization": f"Bearer {teacher_token}"})
        assert res.status_code == 400