import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/user.dart';

class AuthApi {
  AuthApi(this._dio);
  final Dio _dio;

  Future<({String token, User user})> login(String email, String password) async {
    final res = await _dio.post(
      Endpoints.login,
      data: {'email': email, 'password': password},
    );
    final data = res.data as Map<String, dynamic>;
    return (
      token: data['access_token'] as String,
      user: User.fromJson(data['user'] as Map<String, dynamic>),
    );
  }

  Future<({String token, User user})> register({
    required String fullName,
    required String email,
    required String password,
    required String role,
    String? school,
    String? gradeLevel,
  }) async {
    final res = await _dio.post(
      Endpoints.register,
      data: {
        'full_name': fullName,
        'email': email,
        'password': password,
        'role': role,
        if (school != null) 'school': school,
        if (gradeLevel != null) 'grade_level': gradeLevel,
      },
    );
    final data = res.data as Map<String, dynamic>;
    return (
      token: data['access_token'] as String,
      user: User.fromJson(data['user'] as Map<String, dynamic>),
    );
  }

  Future<void> forgotPassword(String email) async {
    await _dio.post(Endpoints.forgotPassword, data: {'email': email});
  }

  Future<void> resetPassword(String token, String newPassword) async {
    await _dio.post(
      Endpoints.resetPassword,
      data: {'token': token, 'new_password': newPassword},
    );
  }

  Future<User> me() async {
    final res = await _dio.get(Endpoints.me);
    return User.fromJson(res.data as Map<String, dynamic>);
  }
}

final authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(dioProvider)),
);
