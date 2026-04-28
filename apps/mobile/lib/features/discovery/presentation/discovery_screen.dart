import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/class_model.dart';
import '../../../models/user.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../classes/presentation/classes_screen.dart';

final trendingTeachersProvider = FutureProvider<List<User>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(Endpoints.trendingTeachers);
  final list = res.data is List
      ? res.data as List
      : (res.data['items'] as List? ?? []);
  return list.map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
});

final discoveryClassesProvider = FutureProvider<List<ClassModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(Endpoints.publicClasses);
  final list = res.data is List
      ? res.data as List
      : (res.data['items'] as List? ?? []);
  return list
      .map((e) => ClassModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

class DiscoveryScreen extends ConsumerWidget {
  const DiscoveryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teachersAsync = ref.watch(trendingTeachersProvider);
    final classesAsync = ref.watch(discoveryClassesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover'),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.brand,
        onRefresh: () async {
          ref.invalidate(trendingTeachersProvider);
          ref.invalidate(discoveryClassesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(12),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const _SectionHeader(label: 'Trending teachers'),
            SizedBox(
              height: 140,
              child: teachersAsync.when(
                data: (teachers) {
                  if (teachers.isEmpty) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No trending teachers right now'),
                      ),
                    );
                  }
                  return ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    itemCount: teachers.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) => _TeacherCard(teacher: teachers[i]),
                  );
                },
                error: (_, __) =>
                    const Center(child: Text('Could not load teachers')),
                loading: () => const LoadingView(),
              ),
            ),
            const SizedBox(height: 16),
            const _SectionHeader(label: 'Public classes'),
            classesAsync.when(
              data: (classes) {
                if (classes.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                      child: Text('No public classes available yet'),
                    ),
                  );
                }
                return Column(
                  children: classes
                      .map((c) => ClassCard(classModel: c))
                      .toList(),
                );
              },
              error: (e, _) => const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: Text('Could not load classes')),
              ),
              loading: () => const Padding(
                padding: EdgeInsets.all(40),
                child: LoadingView(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: Text(
        label,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _TeacherCard extends StatelessWidget {
  const _TeacherCard({required this.teacher});
  final User teacher;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: SizedBox(
        width: 130,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              UserAvatar(
                imageUrl: teacher.avatarUrl,
                name: teacher.fullName,
                radius: 28,
              ),
              const SizedBox(height: 8),
              Text(
                teacher.fullName,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (teacher.school != null)
                Text(
                  teacher.school!,
                  style: const TextStyle(fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
