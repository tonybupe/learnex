import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from app.deps import get_current_user
from app.models.user import User
from app.services.storage_service import upload_file

router = APIRouter()

ALLOWED_IMAGES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_DOCS = {"application/pdf", "application/msword", "text/plain"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGES:
        raise HTTPException(400, "Only image files are allowed")
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")
    try:
        url = upload_file(contents, file.content_type, folder="images")
        return JSONResponse({"url": url})
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGES:
        raise HTTPException(400, "Only image files are allowed")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(400, "Avatar too large (max 5MB)")
    try:
        url = upload_file(contents, file.content_type, folder=f"avatars/{current_user.id}")
        return JSONResponse({"url": url})
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    allowed = ALLOWED_IMAGES | ALLOWED_DOCS
    if file.content_type not in allowed:
        raise HTTPException(400, "File type not allowed")
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")
    try:
        url = upload_file(contents, file.content_type, folder="documents")
        return JSONResponse({"url": url})
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")