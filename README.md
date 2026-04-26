<div align="center">

# Learnex
### The Intelligent Social Learning Platform for Zambia

[![Live](https://img.shields.io/badge/Live-learn--ex.online-cb26e4?style=for-the-badge)](https://www.learn-ex.online)
[![API](https://img.shields.io/badge/API-api.learn--ex.online-22c55e?style=for-the-badge)](https://api.learn-ex.online/api/v1/docs)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square)](LICENSE)

**AI-powered learning management system combining the engagement of social media with the structure of a formal LMS.**
Built for Zambian educators and students — mobile-first, real-time, and intelligent.

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Getting Started](#getting-started)
6. [Project Structure](#project-structure)
7. [API Reference](#api-reference)
8. [Environment Variables](#environment-variables)
9. [Deployment](#deployment)
10. [Roles and Permissions](#roles-and-permissions)
11. [AI Integration](#ai-integration)
12. [Development Guidelines](#development-guidelines)
13. [Roadmap](#roadmap)
14. [License](#license)

---

## Overview

Learnex is a full-stack, mobile-first social learning management system (LMS) built specifically for Zambian schools, colleges, and independent educators. It bridges the gap between traditional LMS platforms and modern social learning by combining:

- **Social Feed** - Engaging post feed with real-time updates
- **Class Management** - Structured classes with enrollments and member tracking
- **AI Content Generation** - Claude AI for lesson and quiz creation
- **Real-time Communication** - WebSocket messaging and class discussions
- **Live Sessions** - Scheduled and live video sessions
- **Analytics** - Deep insights for teachers and admins

### Why Learnex?

| Traditional LMS | Learnex |
|---|---|
| Static content delivery | Real-time social feed + class discussions |
| Manual quiz creation | AI-generated quizzes from lesson content |
| No live interaction | Integrated live sessions |
| Desktop-only | Mobile-first, responsive design |
| No AI assistance | Claude AI for lessons, quizzes, and grading |
| Isolated learning | Social learning with reactions and discussions |

---

## Features

### For Teachers

- **AI Lesson Generator** - Generate complete lesson content from any topic using Claude AI with structured sections, objectives, examples, and review questions
- **AI Quiz Generator** - Automatically create Multiple Choice, True/False, Short Answer, and Essay questions directly from lesson content
- **AI Grading** - Auto-grade short answer and essay questions with feedback
- **Rich Content Editor** - TipTap-powered editor with formatting, tables, images, code blocks, templates, and slide detection
- **Class Management** - Create public/private classes, manage enrollments, set grade levels
- **Live Presentations** - Present lesson slides in fullscreen live mode with screen sharing
- **Quiz Analytics** - Grade bands, score distribution charts, per-question difficulty analysis
- **Teacher Dashboard** - Real-time KPIs, engagement charts, content overview, AI-powered insights
- **Class Discussion** - WhatsApp-style real-time chat per class with media sharing

### For Learners

- **Social Feed** - Latest, trending, popular, following, and class-specific feeds
- **Quiz Taking** - Timed quizzes with progress tracking, score ring, and question review
- **Class Enrollment** - Join public or private classes with class codes
- **Lesson Discovery** - Browse published lessons, filter by subject and type
- **Real-time Notifications** - Instant alerts for new content, grades, and mentions
- **Learner Dashboard** - Enrolled classes, lesson progress, average quiz scores
- **Discussion Participation** - Join class and lesson discussions

### Platform-wide

- **Real-time Messaging** - WebSocket-powered direct messages with typing indicators, read receipts, and delivered status
- **Discovery Page** - Trending teachers with learner/class counts, public classes, published lessons
- **Notification System** - Smart routing to relevant pages
- **Dark/Light Mode** - Full theme support
- **Mobile-First UI** - Responsive across all screen sizes with touch-friendly interactions
- **Supabase Storage** - Cloud media storage for posts, avatars, and resources
- **Admin Dashboard** - Platform analytics, user management, content moderation

---

## Architecture
learnex/
+-apps/
+-api/           FastAPI backend (Python 3.12)
+-web/           React 18 + TypeScript frontend
+-.gitattributes
+-README.md
### System Architecture
learnex/
+-apps/
+-api/           FastAPI backend (Python 3.12)
+-web/           React 18 + TypeScript frontend
+-.gitattributes
+-README.md+--------------------------------------------------+
|           Client (Browser / Mobile)               |
|         React 18 + TypeScript + Vite              |
|    www.learn-ex.online  (Vercel + Cloudflare)     |
+---------------------+----------------------------+
| HTTPS / WSS
+---------------------v----------------------------+
|              FastAPI Backend                       |
|          api.learn-ex.online  (Render)             |
|                                                    |
|  +-------------+  +-----------+  +-------------+  |
|  |  REST API   |  | WebSocket |  |  Claude AI  |  |
|  | /api/v1/    |  | Messages  |  | Lessons     |  |
|  |             |  |           |  | Quizzes     |  |
|  +------+------+  +-----+-----+  | Grading     |  |
|         |               |        +-------------+  |
+---------+---------------+-------------------+-----+
|               |
+---------v---------------v-------------------+-----+
|              Supabase (PostgreSQL)                  |
|       aws-1-eu-north-1.pooler.supabase.com          |
|                                                     |
|  +------------------+   +----------------------+   |
|  |    Database       |   |   Storage (Media)    |   |
|  |   (PostgreSQL)    |   |  posts/ avatars/     |   |
|  +------------------+   +----------------------+   |
+-----------------------------------------------------+
### Data Flow
User Action
|
v
React Component
|
v
TanStack Query (cache + fetch)
|
v
Axios API Client (/api/client.ts)
|
v
FastAPI Route (/api/v1/routes/)
|
v
Service Layer (/services/)
|
v
SQLAlchemy ORM
|
v
PostgreSQL (Supabase)
---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.12 | Runtime |
| FastAPI | 0.115+ | REST API + WebSockets |
| SQLAlchemy | 2.x | ORM |
| Alembic | Latest | Database migrations |
| PostgreSQL | 15 | Primary database |
| Redis / Valkey | Latest | Caching + pub/sub |
| Anthropic SDK | Latest | Claude AI integration |
| Supabase Python | Latest | Cloud storage |
| Pydantic | v2 | Data validation |
| python-jose | Latest | JWT authentication |
| Bcrypt | Latest | Password hashing |
| Uvicorn | Latest | ASGI server |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 6 | Build tool |
| TanStack Query | v5 | Server state management |
| React Router | v6 | Client-side routing |
| Zustand | Latest | Client state |
| TipTap | Latest | Rich text editor |
| Recharts | Latest | Analytics charts |
| Lucide React | Latest | Icons |
| Axios | Latest | HTTP client |

### Infrastructure

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting + CDN |
| Render | Backend API hosting |
| Cloudflare | DNS, DDoS protection, SSL |
| Supabase | PostgreSQL + File Storage |
| GitHub | Source control + CI/CD |

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.12+
- PostgreSQL 15+ (or Supabase account)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/tonybupe/learnex.git
cd learnex
```

### 2. Backend Setup

```bash
cd apps/api

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your credentials

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

API: `http://localhost:8000`
Docs: `http://localhost:8000/api/v1/docs`

### 3. Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local

# Start development server
npm run dev
```

Frontend: `http://localhost:5173`

### 4. Verify TypeScript

```bash
cd apps/web
npx tsc --noEmit
```

Zero errors expected.

---

## Project Structure

### Backend
apps/api/
+-app/
+-api/
+-v1/
+-routes/
+-auth.py              JWT auth, login, register
+-classes.py           Class management + enrollment
+-discovery.py         Trending teachers, public classes
+-lessons.py           Lesson CRUD + AI generation
+-live_sessions.py     Live session management
+-messaging.py         WebSocket real-time messaging
+-notifications.py     Notification system
+-posts.py             Social feed posts + media upload
+-quizzes.py           Quiz CRUD + AI generation + grading
+-subjects.py          Subject management
+-users.py             User profiles + analytics
+-analytics.py         Dashboard analytics
+-core/
+-config.py                App configuration
+-database.py              Database connection + session
+-models/                    SQLAlchemy ORM models
+-schemas/                   Pydantic request/response schemas
+-services/
+-quiz_service.py          Quiz business logic
+-notification_service.py  Notification broadcasting
+-storage_service.py       Supabase file uploads
+-deps.py                    Dependency injection (auth guards)
+-main.py                    App entry + CORS + router registration
+-alembic/                     Database migrations
+-requirements.txt
+-.env.example
### Frontend
apps/web/src/
+-api/
+-client.ts                  Axios instance with interceptors
+-endpoints.ts               All API endpoint constants
+-components/
+-layout/
+-AppShell.tsx             Main layout wrapper
+-Sidebar.tsx              Navigation sidebar
+-Topbar.tsx               Top navigation bar
+-RightPanel.tsx           Right panel (notifications, stats, teachers)
+-MobileRightPanel.tsx     Mobile slide-up drawer
+-MobileSidebar.tsx        Mobile navigation drawer
+-editor/
+-RichEditor.tsx           TipTap rich text editor with toolbar
+-subjects/
+-SubjectSelector.tsx      Subject dropdown component
+-features/
+-auth/                      Authentication hooks + guards
+-notifications/             Notification hooks + components
+-posts/                     Feed posts, composer, comments
+-users/                     Profile, settings pages
+-classes/                   Class types + components
+-pages/
+-admin/
+-AdminDashboardPage.tsx   Admin control panel
+-auth/
+-LoginPage.tsx            Login page
+-RegisterPage.tsx         Registration with role selection
+-ForgotPasswordPage.tsx   Password reset flow
+-classes/
+-ClassesPage.tsx          Classes list + create modal
+-ClassDetail.tsx          Class detail + chat + members
+-DiscoverClassesPage.tsx  Public class discovery
+-discover/
+-DiscoverPage.tsx         Platform discovery (teachers, classes, lessons)
+-learner/
+-LearnerDashboardPage.tsx Learner KPIs + enrolled classes
+-lessons/
+-LessonsPage.tsx          Lessons list + create
+-LessonDetail.tsx         Lesson view/edit + discussion + resources
+-live-sessions/
+-LiveSessionsPage.tsx     Live sessions management
+-messages/
+-MessagesPage.tsx         Real-time direct messaging
+-quizzes/
+-QuizzesPage.tsx          Quiz list + AI generator + create modal
+-QuizBuilder.tsx          Quiz question builder
+-QuizTaker.tsx            Quiz taking experience + results
+-QuizAnalytics.tsx        Teacher analytics dashboard
+-saved/
+-SavedPage.tsx            Saved posts
+-shared/
+-HomePage.tsx             Dashboard home with feed
+-FeedSection.tsx          Social feed with tabs
+-teacher/
+-TeacherDashboardPage.tsx Teacher KPIs + charts + AI insights
+-App.tsx                      Route definitions
+-main.tsx                     App entry point
---

## API Reference

### Base URLs
Production:   https://api.learn-ex.online/api/v1
Development:  http://localhost:8000/api/v1
Interactive:  https://api.learn-ex.online/api/v1/docs
### Authentication

All protected endpoints require:

```http
Authorization: Bearer <access_token>
```

**Login:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "teacher@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "full_name": "Jane Smith",
    "email": "teacher@example.com",
    "role": "teacher"
  }
}
```

### Core Endpoints

**Authentication**

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/login | User login |
| POST | /auth/register | User registration |
| POST | /auth/forgot-password | Request password reset |
| POST | /auth/reset-password | Reset password with token |

**Classes**

| Method | Endpoint | Description |
|---|---|---|
| GET | /classes | List all classes |
| POST | /classes | Create new class |
| GET | /classes/:id | Get class details |
| PATCH | /classes/:id | Update class |
| DELETE | /classes/:id | Delete class |
| POST | /classes/:id/join | Join a class |
| POST | /classes/:id/leave | Leave a class |
| GET | /classes/:id/members | List class members |

**Lessons**

| Method | Endpoint | Description |
|---|---|---|
| GET | /lessons | List lessons |
| POST | /lessons | Create lesson |
| GET | /lessons/:id | Get lesson |
| PATCH | /lessons/:id | Update lesson |
| DELETE | /lessons/:id | Delete lesson |
| POST | /lessons/ai/generate | AI lesson generation |

**Quizzes**

| Method | Endpoint | Description |
|---|---|---|
| GET | /quizzes | List quizzes |
| POST | /quizzes | Create quiz |
| POST | /quizzes/ai/generate | AI quiz generation |
| POST | /quizzes/:id/start | Start quiz attempt |
| POST | /quizzes/:id/attempts/:aid/submit | Submit quiz |
| POST | /quizzes/:id/attempts/:aid/ai-grade | AI grade attempt |
| GET | /quizzes/:id/attempts | Teacher: all attempts |

**Discovery**

| Method | Endpoint | Description |
|---|---|---|
| GET | /discovery/home | Discovery home feed |
| GET | /discovery/trending-teachers | Teachers with learner/class counts |
| GET | /discovery/public-classes | Public classes with stats |

**Messaging**

| Method | Endpoint | Description |
|---|---|---|
| GET | /messages/conversations | List conversations |
| GET | /messages/:userId | Get message thread |
| POST | /messages/:userId | Send message |
| WS | /ws/messages/:userId | Real-time WebSocket |

**Analytics**

| Method | Endpoint | Description |
|---|---|---|
| GET | /analytics/dashboard/admin | Admin platform stats |
| GET | /analytics/dashboard/teacher | Teacher KPIs |
| GET | /analytics/dashboard/learner | Learner progress |

---

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Authentication
SECRET_KEY=your-super-secret-jwt-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Storage
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=50
```

### Frontend (.env.local)

```env
VITE_API_BASE_URL=https://api.learn-ex.online/api/v1
VITE_WS_URL=wss://api.learn-ex.online
```

---

## Deployment

### Frontend (Vercel)

1. Connect GitHub repository to [vercel.com](https://vercel.com)
2. Set root directory: `apps/web`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables:
VITE_API_BASE_URL = https://api.learn-ex.online/api/v1
VITE_WS_URL      = wss://api.learn-ex.online
### Backend (Render)

1. Connect GitHub repository to [render.com](https://render.com)
2. Set root directory: `apps/api`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all backend environment variables

### DNS (Cloudflare)

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | @ | 76.76.21.21 | ON |
| CNAME | www | cname.vercel-dns.com | ON |
| CNAME | api | learnex-api.onrender.com | ON |

### Domains

| Domain | Service | Status |
|---|---|---|
| www.learn-ex.online | Vercel | Active |
| learn-ex.online | Vercel | Active |
| api.learn-ex.online | Render | Active |

---

## Roles and Permissions

| Feature | Admin | Teacher | Learner |
|---|---|---|---|
| Create classes | Yes | Yes | No |
| Create lessons | Yes | Yes | No |
| AI lesson generation | Yes | Yes | No |
| Edit/delete own content | Yes | Yes | No |
| Create quizzes | Yes | Yes | No |
| AI quiz generation | Yes | Yes | No |
| Take quizzes | No | No | Yes |
| View quiz analytics | Yes | Yes | No |
| AI grade attempts | Yes | Yes | No |
| Join classes | Yes | Yes | Yes |
| Post in feed | Yes | Yes | Yes |
| Send messages | Yes | Yes | Yes |
| Class discussions | Yes | Yes | Yes |
| Host live sessions | Yes | Yes | No |
| View platform analytics | Yes | No | No |
| Manage all users | Yes | No | No |
| Moderate content | Yes | No | No |

---

## AI Integration

Learnex integrates **Claude AI (Anthropic)** for three intelligent features:

### 1. Lesson Generation

```http
POST /lessons/ai/generate
{
  "topic": "Photosynthesis",
  "class_id": 1,
  "subject_id": 2,
  "lesson_type": "note",
  "grade_level": "Form 3"
}
```

Generates complete lesson with:
- Introduction
- Learning objectives
- Key concepts with explanations
- Worked examples
- Summary
- Review questions

### 2. Quiz Generation

```http
POST /quizzes/ai/generate
{
  "lesson_id": 5,
  "class_id": 1,
  "subject_id": 2,
  "title": "Chapter 3 Quiz",
  "multiple_choice": 5,
  "true_false": 3,
  "short_answer": 2,
  "essay": 1,
  "difficulty": "medium"
}
```

Reads lesson content and generates questions with:
- Correct answers embedded
- Difficulty calibration (easy/medium/hard)
- Type-appropriate point values
- Subject-specific content

### 3. AI Grading

```http
POST /quizzes/{id}/attempts/{aid}/ai-grade
```

Evaluates text responses by:
- Reading lesson context
- Comparing answer to expected knowledge
- Awarding partial marks (0 to max_points)
- Generating one-sentence feedback

### Model

All AI features use **Claude Haiku** for fast, cost-effective generation.

---

## Development Guidelines

### Commit Convention
feat:     New feature
fix:      Bug fix
refactor: Code restructuring without behavior change
style:    UI/styling changes
docs:     Documentation updates
chore:    Build, dependencies, configuration
perf:     Performance improvements
test:     Test additions or changes
Examples:
```bash
git commit -m "feat: add AI quiz generator with lesson content integration"
git commit -m "fix: ClassDetail early returns before hooks causing React error 310"
git commit -m "style: QuizzesPage mobile-first rewrite with pill tabs"
```

### Code Standards

**TypeScript**
- Use strict mode
- Avoid `any` where possible
- Define interfaces for all API responses
- Use TanStack Query for all server state

**Python**
- Follow PEP 8
- Use type hints throughout
- Use Pydantic v2 for all schemas
- Keep routes thin, business logic in services

**UI Components**
- Mobile-first: always test at 375px width
- Use `isMobile` hook pattern for breakpoints
- All interactive elements minimum 44px touch target
- No inline `localhost` references

### File I/O Rule (Critical)

Always use byte-safe operations to prevent UTF-8 encoding corruption:

```powershell
# CORRECT - byte safe
$bytes = [System.IO.File]::ReadAllBytes($path)
$content = [System.Text.Encoding]::UTF8.GetString($bytes)
# ... modify content ...
[System.IO.File]::WriteAllBytes($path, [System.Text.Encoding]::UTF8.GetBytes($content))

# WRONG - causes garbled characters
Get-Content $path
[System.IO.File]::WriteAllText($path, $content)  # no encoding param
Out-File $path
```

### Preventing Garbled Characters

- Never use emojis in source code comments
- Use plain ASCII for section dividers: `// -- Section --`
- Use HTML entities for special chars: `&copy;` `&times;` `&middot;`
- Never pipe Unicode files through PowerShell's default encoding

---

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | nthnbupe@gmail.com | bupe1407 |
| Teacher | janes@gmail.com | Test1234! |
| Learner | atalia@gmail.com | atalia1234 |

---

## Roadmap

### In Progress
- Posts upload to Supabase Storage (fix 500 errors)
- Redis/Valkey integration for feed caching

### Planned
- **Flutterwave Payments** - Subscription billing for premium features
- **Email Notifications** - SendGrid/Resend for password reset and alerts
- **PWA Support** - Offline-capable progressive web app
- **learnex.co.zm** - Zambian domain activation
- **Bundle Optimization** - Code splitting to reduce JS bundle size
- **Mobile App** - React Native companion app
- **ML Grading Model** - Fine-tuned model that learns from teacher corrections
- **Video Lessons** - Integrated video player with progress tracking
- **Parent Portal** - Parent access to monitor learner progress
- **SMS Notifications** - Zamtel/Airtel SMS for critical alerts

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with passion for Zambian education**

[www.learn-ex.online](https://www.learn-ex.online)
-
[API Docs](https://api.learn-ex.online/api/v1/docs)
-
[GitHub](https://github.com/tonybupe/learnex)

Powered by Claude AI + FastAPI + React + PostgreSQL

Learnex (c) 2026 - All rights reserved

</div>