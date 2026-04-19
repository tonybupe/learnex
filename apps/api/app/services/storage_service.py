import uuid
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://iklaxfhwyausxuxrnpfe.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
BUCKET = "uploads"

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def upload_file(contents: bytes, content_type: str, folder: str = "images") -> str:
    """Upload file to Supabase Storage and return public URL."""
    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    filename = f"{folder}/{uuid.uuid4().hex}.{ext}"
    supabase = get_supabase()
    supabase.storage.from_(BUCKET).upload(
        filename,
        contents,
        {"content-type": content_type, "upsert": "true"}
    )
    url = supabase.storage.from_(BUCKET).get_public_url(filename)
    return url

def delete_file(url: str) -> None:
    """Delete file from Supabase Storage by public URL."""
    try:
        # Extract path from URL
        # URL: https://xxx.supabase.co/storage/v1/object/public/uploads/images/abc.jpg
        path = url.split(f"/object/public/{BUCKET}/")[-1]
        supabase = get_supabase()
        supabase.storage.from_(BUCKET).remove([path])
    except Exception as e:
        print(f"Warning: Could not delete file {url}: {e}")