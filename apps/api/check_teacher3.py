from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Test with real teacher janes@gmail.com (id=2, has ICT CLASS)
res = client.post('/api/v1/auth/login', json={'email': 'janes@gmail.com', 'password': 'bupe1407'})
print('Janes login:', res.status_code)
if res.status_code == 200:
    token = res.json()['access_token']
    headers = {'Authorization': 'Bearer ' + token}
    user = client.get('/api/v1/users/me', headers=headers).json()
    print('User:', user.get('full_name'), 'id='+str(user.get('id')), 'role='+user.get('role'))

    mine = client.get('/api/v1/classes?mine=true', headers=headers).json()
    print('My classes:', len(mine))
    for c in mine:
        print('  -', c.get('id'), c.get('title'), 'teacher_id='+str(c.get('teacher_id')))

    lessons = client.get('/api/v1/lessons', headers=headers).json()
    llist = lessons if isinstance(lessons, list) else []
    print('Lessons visible:', len(llist))
    for l in llist[:3]:
        print('  -', l.get('id'), l.get('title'), 'teacher_id='+str(l.get('teacher_id')))
else:
    print('Login failed - try different password')
    # Try with test teachers
    res2 = client.post('/api/v1/auth/login', json={'email': 'teacher_1d31f8c7@test.learnex.com', 'password': 'Test1234!'})
    print('Test teacher login:', res2.status_code)
    if res2.status_code == 200:
        token = res2.json()['access_token']
        headers = {'Authorization': 'Bearer ' + token}
        user = client.get('/api/v1/users/me', headers=headers).json()
        print('User:', user.get('full_name'), 'id='+str(user.get('id')))
        mine = client.get('/api/v1/classes?mine=true', headers=headers).json()
        print('My classes:', len(mine))
        for c in mine:
            print('  -', c.get('id'), c.get('title'), 'teacher_id='+str(c.get('teacher_id')))