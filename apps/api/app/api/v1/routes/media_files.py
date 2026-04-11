from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.media_file import MediaFile
from app.models.user import User
from app.schemas.media_files import MediaActionResponse, MediaFileResponse, MediaFileUpdate
from app.services.media_service import create_media_record, hard_delete_media_file, soft_delete_media, update_media_record

router = APIRouter()


@router.post("/upload", response_model=MediaFileResponse)
def upload_media(
    file: UploadFile = File(...),
    visibility: str = Form(default="private"),
    entity_type: str | None = Form(default=None),
    entity_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return create_media_record(
            db,
            owner=current_user,
            upload=file,
            visibility=visibility,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("", response_model=List[MediaFileResponse])
def list_my_media(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(MediaFile)
        .filter(MediaFile.owner_id == current_user.id, MediaFile.is_deleted.is_(False))
        .order_by(MediaFile.created_at.desc())
        .all()
    )


@router.get("/{media_id}", response_model=MediaFileResponse)
def get_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    media = db.query(MediaFile).filter(MediaFile.id == media_id, MediaFile.is_deleted.is_(False)).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if current_user.role != "admin" and media.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this media file")

    return media


@router.patch("/{media_id}", response_model=MediaFileResponse)
def update_media(
    media_id: int,
    payload: MediaFileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    media = db.query(MediaFile).filter(MediaFile.id == media_id, MediaFile.is_deleted.is_(False)).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if current_user.role != "admin" and media.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own media")

    return update_media_record(db, media, payload.visibility, payload.entity_type, payload.entity_id)


@router.delete("/{media_id}", response_model=MediaActionResponse)
def delete_media(
    media_id: int,
    permanent: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if current_user.role != "admin" and media.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own media")

    if permanent:
        hard_delete_media_file(media)
        db.delete(media)
        db.commit()
        return MediaActionResponse(message="Media permanently deleted")

    soft_delete_media(db, media)
    return MediaActionResponse(message="Media deleted successfully")


@router.get("/entity/{entity_type}/{entity_id}", response_model=List[MediaFileResponse])
def list_media_for_entity(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(MediaFile)
        .filter(
            MediaFile.entity_type == entity_type,
            MediaFile.entity_id == entity_id,
            MediaFile.is_deleted.is_(False),
        )
        .order_by(MediaFile.created_at.desc())
        .all()
    )


@router.get("/admin/all", response_model=List[MediaFileResponse])
def admin_list_all_media(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return db.query(MediaFile).order_by(MediaFile.created_at.desc()).all()