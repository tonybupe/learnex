from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.deps import get_current_user, require_roles
from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.user import User
from app.schemas.classes import (
    ClassCreate,
    ClassMembershipActionResponse,
    ClassMemberResponse,
    ClassResponse,
    ClassUpdate,
)
from app.services.class_service import (
    create_classroom,
    join_classroom,
    leave_classroom,
    update_classroom,
)

router = APIRouter()

def base_class_query(db: Session):
    return db.query(ClassRoom).options(
        joinedload(ClassRoom.teacher),
        joinedload(ClassRoom.subject),
    )

@router.post("", response_model=ClassResponse)
def create_class_route(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher")),
):
    try:
        classroom = create_classroom(db, current_user, payload)
        return base_class_query(db).filter(ClassRoom.id == classroom.id).first()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("", response_model=List[ClassResponse])
def list_classes(
    mine: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = base_class_query(db)
    if mine:
        q = q.filter(ClassRoom.teacher_id == current_user.id)
    return q.order_by(ClassRoom.created_at.desc()).all()

@router.get("/enrolled", response_model=List[ClassResponse])
def enrolled_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return classes the user has joined as a member (any role)."""
    enrolled_ids = db.query(ClassMember.class_id).filter(
        ClassMember.learner_id == current_user.id,
        ClassMember.status == "active"
    ).subquery()
    return base_class_query(db).filter(ClassRoom.id.in_(enrolled_ids)).order_by(ClassRoom.created_at.desc()).all()

@router.get("/discover", response_model=List[ClassResponse])
def discover_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        base_class_query(db)
        .filter(ClassRoom.visibility == "public", ClassRoom.status == "active")
        .order_by(ClassRoom.created_at.desc())
        .all()
    )

@router.get("/{class_id}", response_model=ClassResponse)
def get_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    classroom = base_class_query(db).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    return classroom

@router.patch("/{class_id}", response_model=ClassResponse)
def update_class_route(
    class_id: int,
    payload: ClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    if current_user.role == "teacher" and classroom.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own classes")
    try:
        updated = update_classroom(db, classroom, payload)
        return base_class_query(db).filter(ClassRoom.id == updated.id).first()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.delete("/{class_id}")
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("teacher", "admin")),
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    if current_user.role == "teacher" and classroom.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own classes")
    db.delete(classroom)
    db.commit()
    return {"message": "Class deleted successfully"}

@router.post("/{class_id}/join", response_model=ClassMembershipActionResponse)
def join_class_route(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated user can join a class. Teachers cannot join their own class."""
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    if classroom.teacher_id == current_user.id:
        raise HTTPException(status_code=403, detail="You cannot join your own class")
    try:
        join_classroom(db, current_user, classroom)
        return ClassMembershipActionResponse(message="Joined class successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.post("/{class_id}/leave", response_model=ClassMembershipActionResponse)
def leave_class_route(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated user can leave a class they joined."""
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    try:
        leave_classroom(db, current_user, classroom)
        return ClassMembershipActionResponse(message="Left class successfully")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/{class_id}/members", response_model=List[ClassMemberResponse])
def list_class_members(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    is_class_teacher = classroom.teacher_id == current_user.id
    is_admin = current_user.role == "admin"
    is_member = db.query(ClassMember).filter(
        ClassMember.class_id == class_id,
        ClassMember.learner_id == current_user.id,
        ClassMember.status == "active"
    ).first() is not None
    if not (is_class_teacher or is_admin or is_member):
        raise HTTPException(status_code=403, detail="Join this class to view its members")
    members = (
        db.query(ClassMember)
        .options(joinedload(ClassMember.learner))
        .filter(ClassMember.class_id == class_id, ClassMember.status == "active")
        .order_by(ClassMember.created_at.desc())
        .all()
    )
    return members
