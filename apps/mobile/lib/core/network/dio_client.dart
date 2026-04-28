import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';

import '../config/app_config.dart';
import '../storage/secure_store.dart';

final loggerProvider = Provider<Logger>((ref) => Logger(
      printer: PrettyPrinter(methodCount: 0, colors: true, printEmojis: false),
    ));

final dioProvider = Provider<Dio>((ref) {
  final logger = ref.watch(loggerProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await SecureStore.instance.readAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      if (AppConfig.isDevelopment) {
        logger.d('${options.method} ${options.uri}');
      }
      handler.next(options);
    },
    onError: (e, handler) async {
      if (AppConfig.isDevelopment) {
        logger.e('API ERROR ${e.response?.statusCode} ${e.requestOptions.uri}');
      }
      // 401 -> clear tokens, let UI redirect to login
      if (e.response?.statusCode == 401) {
        await SecureStore.instance.clearAll();
      }
      handler.next(e);
    },
  ));

  return dio;
});

/// Friendly error message extraction from Dio errors.
String parseDioError(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['detail'] != null) {
      final detail = data['detail'];
      if (detail is String) return detail;
      if (detail is List && detail.isNotEmpty) {
        final first = detail.first;
        if (first is Map && first['msg'] != null) return first['msg'].toString();
      }
    }
    return error.message ?? 'Network error';
  }
  return error.toString();
}
