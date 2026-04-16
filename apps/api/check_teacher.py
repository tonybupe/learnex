from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)

res = client.post('/api/v1/auth/login', json={'email': 'nthnbupe@gmail.com', 'password': 'bupe1407'})
if res.status_code != 200:
    print('Login failed:', res.text)
    exit()
token = res.json()['access_token']
headers = {'Authorization': 'Bearer ' + token}
user = client.get('/api/v1/users/me', headers=headers).json()
print('User:', user.get('full_name'), 'id='+str(user.get('id')), 'role='+str(user.get('role')))

all_cls = client.get('/api/v1/classes', headers=headers).json()
print('All classes:', len(all_cls))

mine = client.get('/api/v1/classes?mine=true', headers=headers).json()
print('Mine (mine=true):', len(mine))
for c in mine:
    print('  -', c.get('id'), c.get('title'), 'teacher_id='+str(c.get('teacher_id')))

enrolled = client.get('/api/v1/classes/enrolled', headers=headers).json()
print('Enrolled:', len(enrolled))
for c in enrolled:
    print('  -', c.get('id'), c.get('title'))

lessons = client.get('/api/v1/lessons', headers=headers).json()
llist = lessons if isinstance(lessons, list) else lessons.get('data', [])
print('Lessons:', len(llist))
for l in llist[:5]:
    print('  -', l.get('id'), l.get('title'), 'class_id='+str(l.get('class_id')), 'teacher_id='+str(l.get('teacher_id')))