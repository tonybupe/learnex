from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectResponse, SubjectUpdate
from app.services.subject_service import create_subject, update_subject

router = APIRouter()


# ── CREATE (Admin + Teacher) ──────────────────────────────────────
@router.post("", response_model=SubjectResponse)
def create_subject_route(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "teacher")),
):
    existing = db.query(Subject).filter(Subject.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")
    try:
        subject = create_subject(db, payload)
        # Record who created it
        subject.created_by = current_user.id
        db.commit()
        db.refresh(subject)
        return subject
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ── LIST (Everyone) ───────────────────────────────────────────────
@router.get("", response_model=List[SubjectResponse])
def list_subjects(
    mine: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Subject)
    # Teachers can filter to only their own subjects
    if mine and current_user.role == "teacher":
        q = q.filter(Subject.created_by == current_user.id)
    return q.order_by(Subject.name.asc()).all()


# ── GET ONE ───────────────────────────────────────────────────────
@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


# ── UPDATE (Admin always, Teacher only if creator) ────────────────
@router.patch("/{subject_id}", response_model=SubjectResponse)
def update_subject_route(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "teacher")),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Ownership check: teacher can only edit their own subjects
    if current_user.role == "teacher" and subject.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit subjects you created"
        )

    if payload.code:
        existing = db.query(Subject).filter(
            Subject.code == payload.code,
            Subject.id != subject_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Subject code already exists")

    try:
        return update_subject(db, subject, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ── DELETE (Admin always, Teacher only if creator) ────────────────
@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "teacher")),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Ownership check
    if current_user.role == "teacher" and subject.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete subjects you created"
        )

    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}