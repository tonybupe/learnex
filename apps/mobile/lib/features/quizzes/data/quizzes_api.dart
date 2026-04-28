import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/quiz.dart';

class QuizzesApi {
  QuizzesApi(this._dio);
  final Dio _dio;

  Future<List<Quiz>> list({int? classId, int? lessonId, bool? published}) async {
    final res = await _dio.get(Endpoints.quizzes, queryParameters: {
      if (classId != null) 'class_id': classId,
      if (lessonId != null) 'lesson_id': lessonId,
      if (published != null) 'published': published,
    });
    final list = res.data is List
        ? res.data as List
        : (res.data['items'] as List? ?? []);
    return list
        .map((e) => Quiz.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Quiz> get(int id) async {
    final res = await _dio.get(Endpoints.quizById(id));
    return Quiz.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Quiz> create(Map<String, dynamic> data) async {
    final res = await _dio.post(Endpoints.quizzes, data: data);
    return Quiz.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Quiz> aiGenerate({
    required String topic,
    int? classId,
    int? lessonId,
    int questionCount = 10,
    String difficulty = 'medium',
    List<String> questionTypes = const ['multiple_choice'],
  }) async {
    final res = await _dio.post(
      Endpoints.quizzesAiGenerate,
      data: {
        'topic': topic,
        if (classId != null) 'class_id': classId,
        if (lessonId != null) 'lesson_id': lessonId,
        'question_count': questionCount,
        'difficulty': difficulty,
        'question_types': questionTypes,
      },
      options: Options(receiveTimeout: const Duration(minutes: 2)),
    );
    return Quiz.fromJson(res.data as Map<String, dynamic>);
  }

  Future<QuizAttempt> start(int quizId) async {
    final res = await _dio.post(Endpoints.quizStart(quizId));
    return QuizAttempt.fromJson(res.data as Map<String, dynamic>);
  }

  Future<QuizAttempt> submit({
    required int quizId,
    required int attemptId,
    required Map<String, dynamic> answers,
  }) async {
    final res = await _dio.post(
      Endpoints.quizSubmit(quizId, attemptId),
      data: {'answers': answers},
    );
    return QuizAttempt.fromJson(res.data as Map<String, dynamic>);
  }

  Future<QuizAttempt> aiGrade({
    required int quizId,
    required int attemptId,
  }) async {
    final res = await _dio.post(
      Endpoints.quizAiGrade(quizId, attemptId),
      options: Options(receiveTimeout: const Duration(minutes: 2)),
    );
    return QuizAttempt.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<QuizAttempt>> attempts(int quizId) async {
    final res = await _dio.get(Endpoints.quizAttempts(quizId));
    final list = res.data as List? ?? [];
    return list
        .map((e) => QuizAttempt.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final quizzesApiProvider = Provider<QuizzesApi>(
  (ref) => QuizzesApi(ref.watch(dioProvider)),
);
