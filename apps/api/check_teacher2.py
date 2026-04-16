from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.class_room import ClassRoom

db = SessionLocal()

# Find teachers who have classes
teachers_with_classes = db.query(User).join(ClassRoom, ClassRoom.teacher_id == User.id).distinct().all()
print('Teachers with classes:')
for t in teachers_with_classes[:5]:
    cls = db.query(ClassRoom).filter(ClassRoom.teacher_id == t.id).all()
    print(f'  id={t.id} {t.full_name} email={t.email} classes={[c.title for c in cls]}')

# Check what teacher_id=2 user looks like
t2 = db.query(User).filter(User.id == 2).first()
if t2:
    print(f'User id=2: {t2.full_name} email={t2.email} role={t2.role}')

db.close()