from sqlalchemy.orm import Session
from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.subject import Subject
from app.models.user import User
from app.schemas.classes import ClassCreate, ClassUpdate


def create_classroom(db: Session, teacher: User, payload: ClassCreate) -> ClassRoom:
    if teacher.role != "teacher":
        raise ValueError("Only teachers can create classes")
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise ValueError("Subject not found")
    existing_code = db.query(ClassRoom).filter(ClassRoom.class_code == payload.class_code).first()
    if existing_code:
        raise ValueError("Class code already exists")
    classroom = ClassRoom(
        title=payload.title,
        description=payload.description,
        class_code=payload.class_code,
        grade_level=payload.grade_level,
        visibility=payload.visibility,
        status="active",
        teacher_id=teacher.id,
        subject_id=payload.subject_id,
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


def update_classroom(db: Session, classroom: ClassRoom, payload: ClassUpdate) -> ClassRoom:
    if payload.title is not None:
        classroom.title = payload.title
    if payload.description is not None:
        classroom.description = payload.description
    if payload.grade_level is not None:
        classroom.grade_level = payload.grade_level
    if payload.visibility is not None:
        classroom.visibility = payload.visibility
    if payload.status is not None:
        classroom.status = payload.status
    if payload.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
        if not subject:
            raise ValueError("Subject not found")
        classroom.subject_id = payload.subject_id
    db.commit()
    db.refresh(classroom)
    return classroom


def join_classroom(db: Session, user: User, classroom: ClassRoom) -> None:
    """Any authenticated user can join a class as a member.
    Teachers joining other classes get learner privileges in that class."""
    if classroom.teacher_id == user.id:
        raise ValueError("You cannot join your own class")
    existing = (
        db.query(ClassMember)
        .filter(ClassMember.class_id == classroom.id, ClassMember.learner_id == user.id)
        .first()
    )
    if existing and existing.status == "active":
        raise ValueError("You are already a member of this class")
    if existing and existing.status != "active":
        existing.status = "active"
        db.commit()
        return
    member = ClassMember(
        class_id=classroom.id,
        learner_id=user.id,
        status="active",
    )
    db.add(member)
    db.commit()


def leave_classroom(db: Session, user: User, classroom: ClassRoom) -> None:
    """Leave a class. Works for any role."""
    existing = (
        db.query(ClassMember)
        .filter(
            ClassMember.class_id == classroom.id,
            ClassMember.learner_id == user.id,
            ClassMember.status == "active"
        )
        .first()
    )
    if not existing:
        raise ValueError("You are not an active member of this class")
    existing.status = "left"
    db.commit()