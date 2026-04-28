import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/lesson.dart';
import '../data/lessons_api.dart';

final lessonsListProvider = FutureProvider<List<Lesson>>((ref) async {
  return ref.watch(lessonsApiProvider).list(published: true);
});

final lessonsByClassProvider =
    FutureProvider.family<List<Lesson>, int>((ref, classId) async {
  return ref.watch(lessonsApiProvider).list(classId: classId);
});

final lessonDetailProvider =
    FutureProvider.family<Lesson, int>((ref, id) async {
  return ref.watch(lessonsApiProvider).get(id);
});
