import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/lesson.dart';

class LessonsApi {
  LessonsApi(this._dio);
  final Dio _dio;

  Future<List<Lesson>> list({int? classId, int? subjectId, bool? published}) async {
    final res = await _dio.get(Endpoints.lessons, queryParameters: {
      if (classId != null) 'class_id': classId,
      if (subjectId != null) 'subject_id': subjectId,
      if (published != null) 'published': published,
    });
    final list = res.data is List
        ? res.data as List
        : (res.data['items'] as List? ?? []);
    return list
        .map((e) => Lesson.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Lesson> get(int id) async {
    final res = await _dio.get(Endpoints.lessonById(id));
    return Lesson.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Lesson> create(Map<String, dynamic> data) async {
    final res = await _dio.post(Endpoints.lessons, data: data);
    return Lesson.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Lesson> update(int id, Map<String, dynamic> data) async {
    final res = await _dio.patch(Endpoints.lessonById(id), data: data);
    return Lesson.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> delete(int id) => _dio.delete(Endpoints.lessonById(id));

  Future<Lesson> aiGenerate({
    required String topic,
    int? classId,
    int? subjectId,
    String lessonType = 'note',
    String? gradeLevel,
  }) async {
    final res = await _dio.post(
      Endpoints.lessonsAiGenerate,
      data: {
        'topic': topic,
        if (classId != null) 'class_id': classId,
        if (subjectId != null) 'subject_id': subjectId,
        'lesson_type': lessonType,
        if (gradeLevel != null) 'grade_level': gradeLevel,
      },
      options: Options(
        receiveTimeout: const Duration(minutes: 2),
      ),
    );
    return Lesson.fromJson(res.data as Map<String, dynamic>);
  }
}

final lessonsApiProvider = Provider<LessonsApi>(
  (ref) => LessonsApi(ref.watch(dioProvider)),
);
