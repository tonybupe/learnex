# Learnex Mobile (Flutter)

Mobile + Web client for [Learnex](https://github.com/tonybupe/learnex), built with Flutter.

Targets **Android** and **Web**, sharing one codebase with the existing FastAPI backend (`apps/api`) and React web frontend (`apps/web`).

## Stack

- **Flutter 3.27+** / **Dart 3.6+**
- **Riverpod** for state management
- **go_router** for routing (with web URL support)
- **Dio** for REST + **web_socket_channel** for real-time messaging
- **flutter_secure_storage** for auth tokens
- **flutter_html** for lesson content rendering
- **fl_chart** for analytics
- **Material 3** light/dark, brand color `#cb26e4`

## Folder structure

```
lib/
├── main.dart, app.dart
├── core/        # config, theme, network (Dio + WS), storage
├── api/         # endpoint paths
├── models/      # User, Class, Lesson, Quiz, Post, Message, ...
├── features/
│   ├── auth/         (login, register, forgot-password)
│   ├── feed/         (social feed + composer)
│   ├── classes/      (list, detail, members, chat, lessons tabs)
│   ├── lessons/      (list, detail, AI generate)
│   ├── quizzes/      (list, taker with all 4 question types, AI grading)
│   ├── messaging/    (conversations + WS direct messages)
│   ├── live_sessions/(scheduled / live / past)
│   ├── notifications/
│   ├── discovery/    (trending teachers, public classes)
│   ├── dashboard/    (role-aware: admin/teacher/learner with charts)
│   └── profile/      (profile + settings + theme toggle)
├── shared/      # AppShell (responsive sidebar/bottom-nav), state views, avatar
└── routing/     # go_router config with auth guards
```

## Getting started

### 1. Prerequisites

- Flutter 3.27+ — install via [flutter.dev](https://docs.flutter.dev/get-started/install)
- Android Studio (for Android builds) or Chrome (for web)
- Inter font files in `assets/fonts/` (download from [Google Fonts](https://fonts.google.com/specimen/Inter): Regular, Medium 500, SemiBold 600, Bold 700)

### 2. Install dependencies

```bash
cd apps/mobile
flutter pub get
```

### 3. Configure environment

Copy `.env.example` → `.env` and adjust if needed:

```env
API_BASE_URL=https://api.learn-ex.online/api/v1
WS_BASE_URL=wss://api.learn-ex.online
```

For local backend dev, point at `http://10.0.2.2:8000/api/v1` (Android emulator) or `http://localhost:8000/api/v1` (web).

### 4. Run

```bash
# Android (emulator or device)
flutter run

# Web
flutter run -d chrome

# Build release APK
flutter build apk --release

# Build web for production
flutter build web --release
```

## What's implemented

**Done:**
- Auth (login, register with role + grade selector, forgot password, secure token storage, auto-bootstrap from cache)
- Responsive shell (bottom nav under 768px, sidebar over)
- Light/dark/system theme with persistence
- Social feed (4 tabs, post composer, optimistic likes, pull-to-refresh)
- Classes (my/discover tabs, class detail with feed/lessons/chat/members tabs)
- Lessons (list, HTML rendering, AI generation flow for teachers)
- Quizzes (list, full quiz taker with all 4 question types, timer, AI grading for short-answer/essay)
- Messaging (conversations list, real-time chat with WebSocket reconnection)
- Live sessions (live/upcoming/past with join/recording links)
- Notifications (with mark-read and deep-link routing)
- Discovery (trending teachers + public classes)
- Dashboard (role-aware with stats grid + engagement chart)
- Profile + Settings (theme toggle, logout)

**Stubbed for next iteration:**
- Class chat tab (UI placeholder, WS hookup pending)
- Lessons within class detail tab
- Quiz builder (teachers can take quizzes, AI generate is wired but the manual builder UI is pending)
- Live session attend/host UI (Agora/Jitsi integration TBD)
- Push notifications (flutter_local_notifications dep is added; FCM integration pending)
- Lesson presenter mode for slides
- Image/video upload in composer

## Backend contract

This client mirrors `apps/web/src/api/endpoints.ts`. If the FastAPI routes change, update `lib/api/endpoints.dart` to match. Models in `lib/models/` use `snake_case` JSON keys to match the FastAPI defaults.

## Lint & format

```bash
flutter analyze
dart format lib/
```

## License

Same as the parent Learnex repo.
