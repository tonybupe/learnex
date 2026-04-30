import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/forgot_password_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/classes/presentation/class_detail_screen.dart';
import '../features/classes/presentation/classes_screen.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/discovery/presentation/discovery_screen.dart';
import '../features/feed/presentation/home_screen.dart';
import '../features/lessons/presentation/lesson_detail_screen.dart';
import '../features/lessons/presentation/lessons_screen.dart';
import '../features/live_sessions/presentation/live_sessions_screen.dart';
import '../features/messaging/presentation/conversation_screen.dart';
import '../features/messaging/presentation/messages_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/profile/presentation/settings_screen.dart';
import '../features/quizzes/presentation/quiz_taker_screen.dart';
import '../features/quizzes/presentation/quizzes_screen.dart';
import '../shared/widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/',
    redirect: (ctx, state) {
      final auth = ref.read(authProvider);
      final loggingIn = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register' ||
          state.matchedLocation == '/forgot-password';

      if (auth is AuthInitial) return null;
      if (auth is AuthUnauthenticated || auth is AuthError) {
        return loggingIn ? null : '/login';
      }
      if (auth is AuthAuthenticated && loggingIn) return '/';
      return null;
    },
    routes: [
      // ── Auth routes (no shell) ──
      GoRoute(path: '/login',           builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register',        builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),

      // ── Main shell with bottom nav / sidebar ──
      ShellRoute(
        builder: (ctx, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/',              builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/classes',       builder: (_, __) => const ClassesScreen()),
          GoRoute(path: '/discover',      builder: (_, __) => const DiscoveryScreen()),
          GoRoute(path: '/messages',      builder: (_, __) => const MessagesScreen()),
          GoRoute(path: '/profile',       builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/lessons',       builder: (_, __) => const LessonsScreen()),
          GoRoute(path: '/quizzes',       builder: (_, __) => const QuizzesScreen()),
          GoRoute(path: '/live-sessions', builder: (_, __) => const LiveSessionsScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/dashboard',     builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/settings',      builder: (_, __) => const SettingsScreen()),

          // Detail routes inside shell so back button works properly
          GoRoute(
            path: '/classes/:id',
            builder: (ctx, state) => ClassDetailScreen(
              classId: int.tryParse(state.pathParameters['id'] ?? '') ?? 0,
            ),
          ),
          GoRoute(
            path: '/lessons/:id',
            builder: (ctx, state) => LessonDetailScreen(
              lessonId: int.tryParse(state.pathParameters['id'] ?? '') ?? 0,
            ),
          ),
          GoRoute(
            path: '/quizzes/:id/take',
            builder: (ctx, state) => QuizTakerScreen(
              quizId: int.tryParse(state.pathParameters['id'] ?? '') ?? 0,
            ),
          ),
          GoRoute(
            path: '/messages/:userId',
            builder: (ctx, state) => ConversationScreen(
              userId: int.tryParse(state.pathParameters['userId'] ?? '') ?? 0,
            ),
          ),
        ],
      ),
    ],
    errorBuilder: (ctx, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              state.error?.toString() ?? 'Page not found',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ctx.go('/'),
              child: const Text('Go home'),
            ),
          ],
        ),
      ),
    ),
  );

  // Refresh router when auth state changes
  ref.listen(authProvider, (_, __) => router.refresh());

  return router;
});