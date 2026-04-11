from sqlalchemy.orm import Session

from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate


def create_subject(db: Session, payload: SubjectCreate) -> Subject:
    existing_name = db.query(Subject).filter(Subject.name == payload.name).first()
    if existing_name:
        raise ValueError("Subject name already exists")

    existing_code = db.query(Subject).filter(Subject.code == payload.code).first()
    if existing_code:
        raise ValueError("Subject code already exists")

    subject = Subject(
        name=payload.name,
        code=payload.code,
        description=payload.description,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def update_subject(db: Session, subject: Subject, payload: SubjectUpdate) -> Subject:
    if payload.name and payload.name != subject.name:
        existing_name = db.query(Subject).filter(Subject.name == payload.name).first()
        if existing_name:
            raise ValueError("Subject name already exists")
        subject.name = payload.name

    if payload.code and payload.code != subject.code:
        existing_code = db.query(Subject).filter(Subject.code == payload.code).first()
        if existing_code:
            raise ValueError("Subject code already exists")
        subject.code = payload.code

    if payload.description is not None:
        subject.description = payload.description

    db.commit()
    db.refresh(subject)
    return subject