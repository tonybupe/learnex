import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/class_model.dart';
import '../../../models/user.dart';
import '../data/classes_api.dart';

// ── My Classes (StateNotifier for mutations) ──────────────────────
class ClassesNotifier extends StateNotifier<AsyncValue<List<ClassModel>>> {
  ClassesNotifier(this._api) : super(const AsyncLoading()) {
    load();
  }
  final ClassesApi _api;

  Future<void> load() async {
    state = const AsyncLoading();
    try {
      final list = await _api.list(mine: true);
      state = AsyncData(list);
    } catch (e, s) {
      state = AsyncError(e, s);
    }
  }

  Future<void> createClass({
    required String title,
    String? description,
    String? visibility,
  }) async {
    final cls = await _api.create(
      name: title,
      description: description,
      isPublic: visibility == 'public',
    );
    state.whenData((list) {
      state = AsyncData([cls, ...list]);
    });
  }

  Future<void> joinClass(int id, {String? code}) async {
    await _api.join(id, code: code);
    await load();
  }

  Future<void> leaveClass(int id) async {
    await _api.leave(id);
    await load();
  }
}

final classesListProvider =
    StateNotifierProvider<ClassesNotifier, AsyncValue<List<ClassModel>>>(
  (ref) => ClassesNotifier(ref.watch(classesApiProvider)),
);

// ── Discover public classes ───────────────────────────────────────
final discoverClassesProvider = FutureProvider<List<ClassModel>>((ref) async {
  return ref.watch(classesApiProvider).list(isPublic: true);
});

// ── Single class ──────────────────────────────────────────────────
final classDetailProvider =
    FutureProvider.family<ClassModel, int>((ref, id) async {
  return ref.watch(classesApiProvider).get(id);
});

// ── Class members ─────────────────────────────────────────────────
final classMembersProvider =
    FutureProvider.family<List<User>, int>((ref, id) async {
  return ref.watch(classesApiProvider).members(id);
});

// ── Class lessons ─────────────────────────────────────────────────
final classLessonsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, int>((ref, id) async {
  final api = ref.watch(classesApiProvider);
  return api.lessons(id);
});