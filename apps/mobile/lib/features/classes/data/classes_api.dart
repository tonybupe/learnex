import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/class_model.dart';
import '../../../models/user.dart';

class ClassesApi {
  ClassesApi(this._dio);
  final Dio _dio;

  Future<List<ClassModel>> list({bool? isPublic, bool? mine}) async {
    final res = await _dio.get(Endpoints.classes, queryParameters: {
      if (isPublic != null) 'is_public': isPublic,
      if (mine != null) 'mine': mine,
    });
    final list = res.data is List
        ? res.data as List
        : (res.data['items'] as List? ?? []);
    return list
        .map((e) => ClassModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ClassModel> get(int id) async {
    final res = await _dio.get(Endpoints.classById(id));
    return ClassModel.fromJson(res.data as Map<String, dynamic>);
  }

  Future<ClassModel> create({
    required String name,
    String? description,
    String? gradeLevel,
    int? subjectId,
    bool isPublic = true,
  }) async {
    final res = await _dio.post(Endpoints.classes, data: {
      'name': name,
      if (description != null) 'description': description,
      if (gradeLevel != null) 'grade_level': gradeLevel,
      if (subjectId != null) 'subject_id': subjectId,
      'is_public': isPublic,
    });
    return ClassModel.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> join(int id, {String? code}) async {
    await _dio.post(
      Endpoints.classJoin(id),
      data: code != null ? {'class_code': code} : null,
    );
  }

  Future<void> leave(int id) => _dio.post(Endpoints.classLeave(id));

  Future<List<User>> members(int id) async {
    final res = await _dio.get(Endpoints.classMembers(id));
    final list = res.data as List? ?? [];
    return list.map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
  }
}

final classesApiProvider = Provider<ClassesApi>(
  (ref) => ClassesApi(ref.watch(dioProvider)),
);
