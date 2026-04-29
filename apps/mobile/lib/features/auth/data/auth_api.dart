import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/user.dart';

class AuthApi {
  AuthApi(this._dio);
  final Dio _dio;

  Future<({String token, User user})> login(
      String email, String password) async {
    // Step 1: get token
    final res = await _dio.post(
      Endpoints.login,
      data: {'email': email, 'password': password},
    );
    final data = res.data as Map<String, dynamic>;
    final token = data['access_token'] as String;

    // Step 2: fetch user profile using the new token
    final meRes = await _dio.get(
      Endpoints.me,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final user = User.fromJson(meRes.data as Map<String, dynamic>);
    return (token: token, user: user);
  }

  Future<({String token, User user})> register({
    required String fullName,
    required String email,
    required String password,
    required String role,
    String? phone,
    String? school,
    String? gradeLevel,
  }) async {
    // Step 1: register
    await _dio.post(
      Endpoints.register,
      data: {
        'full_name': fullName,
        'email': email,
        'password': password,
        'role': role,
        if (phone != null && phone.isNotEmpty) 'phone_number': phone,
        if (school != null && school.isNotEmpty) 'school': school,
        if (gradeLevel != null) 'grade_level': gradeLevel,
      },
    );

    // Step 2: login to get token
    final loginRes = await _dio.post(
      Endpoints.login,
      data: {'email': email, 'password': password},
    );
    final loginData = loginRes.data as Map<String, dynamic>;
    final token = loginData['access_token'] as String;

    // Step 3: fetch user profile
    final meRes = await _dio.get(
      Endpoints.me,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final user = User.fromJson(meRes.data as Map<String, dynamic>);
    return (token: token, user: user);
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