import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/secure_store.dart';
import '../../../models/user.dart';
import '../data/auth_api.dart';

sealed class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);
  final User user;
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

class AuthError extends AuthState {
  const AuthError(this.message);
  final String message;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._api) : super(const AuthInitial()) {
    _bootstrap();
  }

  final AuthApi _api;

  Future<void> _bootstrap() async {
    final token = await SecureStore.instance.readAccessToken();
    if (token == null || token.isEmpty) {
      state = const AuthUnauthenticated();
      return;
    }
    final cachedUserJson = await SecureStore.instance.readUser();
    if (cachedUserJson != null) {
      try {
        final user = User.fromJson(
          jsonDecode(cachedUserJson) as Map<String, dynamic>,
        );
        state = AuthAuthenticated(user);
      } catch (_) {
        state = const AuthUnauthenticated();
        return;
      }
    }
    // Try to refresh from /me, fall back to cache if it fails
    try {
      final me = await _api.me();
      await SecureStore.instance.writeUser(jsonEncode(me.toJson()));
      state = AuthAuthenticated(me);
    } catch (_) {
      // keep current state (cached user or unauthenticated)
      if (state is AuthInitial) state = const AuthUnauthenticated();
    }
  }

  Future<void> login(String email, String password) async {
    state = const AuthLoading();
    try {
      final result = await _api.login(email, password);
      await SecureStore.instance.writeAccessToken(result.token);
      await SecureStore.instance.writeUser(jsonEncode(result.user.toJson()));
      state = AuthAuthenticated(result.user);
    } catch (e) {
      state = AuthError(_friendly(e));
    }
  }

  Future<void> register({
    required String fullName,
    required String email,
    required String password,
    required String role,
    String? phone,
    String? school,
    String? gradeLevel,
  }) async {
    state = const AuthLoading();
    try {
      final result = await _api.register(
        fullName: fullName,
        email: email,
        password: password,
        role: role,
        phone: phone,
        school: school,
        gradeLevel: gradeLevel,
      );
      await SecureStore.instance.writeAccessToken(result.token);
      await SecureStore.instance.writeUser(jsonEncode(result.user.toJson()));
      state = AuthAuthenticated(result.user);
    } catch (e) {
      state = AuthError(_friendly(e));
    }
  }

  Future<void> logout() async {
    await SecureStore.instance.clearAll();
    state = const AuthUnauthenticated();
  }

  Future<void> forgotPassword(String email) async {
    await _api.forgotPassword(email);
  }

  String _friendly(Object e) {
    final s = e.toString();
    if (s.contains('401')) return 'Invalid email or password';
    if (s.contains('404')) return 'Account not found';
    if (s.contains('Network') || s.contains('SocketException')) {
      return 'No internet connection';
    }
    return 'Something went wrong. Please try again.';
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref.watch(authApiProvider)),
);

final currentUserProvider = Provider<User?>((ref) {
  final state = ref.watch(authProvider);
  return state is AuthAuthenticated ? state.user : null;
});
