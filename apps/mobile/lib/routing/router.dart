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
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (ctx, state) {
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
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (_, __) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      ShellRoute(
        builder: (ctx, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => const HomeScreen(),
          ),
          GoRoute(
            path: '/classes',
            builder: (_, __) => const ClassesScreen(),
          ),
          GoRoute(
            path: '/discover',
            builder: (_, __) => const DiscoveryScreen(),
          ),
          GoRoute(
            path: '/messages',
            builder: (_, __) => const MessagesScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/lessons',
            builder: (_, __) => const LessonsScreen(),
          ),
          GoRoute(
            path: '/quizzes',
            builder: (_, __) => const QuizzesScreen(),
          ),
          GoRoute(
            path: '/live-sessions',
            builder: (_, __) => const LiveSessionsScreen(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (_, __) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/dashboard',
            builder: (_, __) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (_, __) => const SettingsScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/classes/:id',
        builder: (ctx, state) => ClassDetailScreen(
          classId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/lessons/:id',
        builder: (ctx, state) => LessonDetailScreen(
          lessonId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/quizzes/:id/take',
        builder: (ctx, state) => QuizTakerScreen(
          quizId: int.parse(state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/messages/:userId',
        builder: (ctx, state) => ConversationScreen(
          userId: int.parse(state.pathParameters['userId']!),
        ),
      ),
    ],
    errorBuilder: (ctx, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64),
            const SizedBox(height: 16),
            Text(state.error?.toString() ?? 'Page not found'),
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
});
