import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/class_model.dart';
import '../../../models/user.dart';
import '../data/classes_api.dart';

final myClassesProvider = FutureProvider<List<ClassModel>>((ref) async {
  return ref.watch(classesApiProvider).list(mine: true);
});

final publicClassesProvider = FutureProvider<List<ClassModel>>((ref) async {
  return ref.watch(classesApiProvider).list(isPublic: true);
});

final classDetailProvider =
    FutureProvider.family<ClassModel, int>((ref, id) async {
  return ref.watch(classesApiProvider).get(id);
});

final classMembersProvider =
    FutureProvider.family<List<User>, int>((ref, id) async {
  return ref.watch(classesApiProvider).members(id);
});
