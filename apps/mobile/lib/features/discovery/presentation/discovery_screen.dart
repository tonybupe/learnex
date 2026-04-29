import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/class_model.dart';
import '../../../models/user.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';

// ── Providers ────────────────────────────────────────────────────
final trendingTeachersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(Endpoints.trendingTeachers);
  final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
  return list.cast<Map<String, dynamic>>();
});

final discoveryClassesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(Endpoints.publicClasses);
  final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
  return list.cast<Map<String, dynamic>>();
});

final discoveryLessonsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get('${Endpoints.lessons}?status=published&limit=12');
  final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
  return list.cast<Map<String, dynamic>>();
});

// ── Screen ───────────────────────────────────────────────────────
class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 3, vsync: this);
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _tab.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(104),
          child: Column(
            children: [
              // Search bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => setState(() => _query = v.toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Search teachers, classes, lessons...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _query.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            onPressed: () {
                              _searchCtrl.clear();
                              setState(() => _query = '');
                            },
                          )
                        : null,
                    filled: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              // Tabs
              TabBar(
                controller: _tab,
                labelColor: AppColors.brand,
                indicatorColor: AppColors.brand,
                tabs: const [
                  Tab(text: 'Teachers'),
                  Tab(text: 'Classes'),
                  Tab(text: 'Lessons'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _TeachersTab(query: _query),
          _ClassesTab(query: _query),
          _LessonsTab(query: _query),
        ],
      ),
    );
  }
}

// ── Teachers Tab ─────────────────────────────────────────────────
class _TeachersTab extends ConsumerWidget {
  const _TeachersTab({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(trendingTeachersProvider);
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: 'Could not load teachers',
        onRetry: () => ref.refresh(trendingTeachersProvider),
      ),
      data: (teachers) {
        final filtered = query.isEmpty
            ? teachers
            : teachers.where((t) =>
                (t['full_name'] as String? ?? '').toLowerCase().contains(query)).toList();

        if (filtered.isEmpty) {
          return EmptyView(
            title: query.isNotEmpty ? 'No teachers found' : 'No teachers yet',
            subtitle: 'Check back soon',
            icon: Icons.person_search_outlined,
          );
        }

        return RefreshIndicator(
          color: AppColors.brand,
          onRefresh: () => ref.refresh(trendingTeachersProvider.future),
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.85,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: filtered.length,
            itemBuilder: (_, i) => _TeacherCard(data: filtered[i]),
          ),
        );
      },
    );
  }
}

class _TeacherCard extends StatelessWidget {
  const _TeacherCard({required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final name = data['full_name'] as String? ?? 'Teacher';
    final classesCount = data['classes_count'] ?? 0;
    final learnersCount = data['learners_count'] ?? 0;
    final lessonsCount = data['lessons_count'] ?? 0;
    final id = data['id'] as int? ?? 0;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Theme.of(context).dividerColor),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/profile/$id'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              UserAvatar(name: name, radius: 30),
              const SizedBox(height: 8),
              Text(
                name,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              const Text('Teacher', style: TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _Stat(label: 'Classes', value: '$classesCount', color: AppColors.brand),
                  _Stat(label: 'Learners', value: '$learnersCount', color: AppColors.accent),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.push('/profile/$id'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    side: const BorderSide(color: AppColors.brand),
                    foregroundColor: AppColors.brand,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('View', style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Classes Tab ───────────────────────────────────────────────────
class _ClassesTab extends ConsumerWidget {
  const _ClassesTab({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(discoveryClassesProvider);
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: 'Could not load classes',
        onRetry: () => ref.refresh(discoveryClassesProvider),
      ),
      data: (classes) {
        final filtered = query.isEmpty
            ? classes
            : classes.where((c) =>
                (c['title'] as String? ?? c['name'] as String? ?? '')
                    .toLowerCase().contains(query) ||
                (c['description'] as String? ?? '').toLowerCase().contains(query)).toList();

        if (filtered.isEmpty) {
          return EmptyView(
            title: query.isNotEmpty ? 'No classes found' : 'No public classes',
            icon: Icons.class_outlined,
          );
        }

        return RefreshIndicator(
          color: AppColors.brand,
          onRefresh: () => ref.refresh(discoveryClassesProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _ClassCard(data: filtered[i]),
          ),
        );
      },
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({required this.data});
  final Map<String, dynamic> data;

  static const _colors = [
    AppColors.brand, Color(0xFF38BDF8), AppColors.accent,
    AppColors.warning, Color(0xFF8B5CF6), AppColors.danger,
  ];

  @override
  Widget build(BuildContext context) {
    final title = data['title'] as String? ?? data['name'] as String? ?? 'Class';
    final description = data['description'] as String? ?? '';
    final enrolledCount = data['enrolled_count'] ?? data['members_count'] ?? 0;
    final lessonCount = data['lesson_count'] ?? 0;
    final isPublic = data['visibility'] == 'public' || (data['is_public'] == true);
    final id = data['id'] as int? ?? 0;
    final teacher = data['teacher'] as Map<String, dynamic>?;
    final color = _colors[id % _colors.length];

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Theme.of(context).dividerColor),
      ),
      clipBehavior: Clip.hardEdge,
      child: InkWell(
        onTap: () => context.push('/classes/$id'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Color bar
            Container(height: 4, color: color),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isPublic
                              ? AppColors.accent.withValues(alpha: 0.1)
                              : Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isPublic ? Icons.public : Icons.lock_outline,
                              size: 10,
                              color: isPublic ? AppColors.accent : Colors.grey,
                            ),
                            const SizedBox(width: 3),
                            Text(
                              isPublic ? 'Public' : 'Private',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: isPublic ? AppColors.accent : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _Stat(
                        label: 'Learners',
                        value: '$enrolledCount',
                        color: color,
                        icon: Icons.people_outline,
                      ),
                      const SizedBox(width: 16),
                      _Stat(
                        label: 'Lessons',
                        value: '$lessonCount',
                        color: Colors.grey,
                        icon: Icons.menu_book_outlined,
                      ),
                      if (teacher != null) ...[
                        const SizedBox(width: 16),
                        Expanded(
                          child: Row(
                            children: [
                              Icon(Icons.person_outline, size: 13, color: Colors.grey[500]),
                              const SizedBox(width: 3),
                              Expanded(
                                child: Text(
                                  teacher['full_name'] as String? ?? 'Teacher',
                                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.push('/classes/$id'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: color,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      child: const Text('View Class', style: TextStyle(fontSize: 13)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Lessons Tab ───────────────────────────────────────────────────
class _LessonsTab extends ConsumerWidget {
  const _LessonsTab({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(discoveryLessonsProvider);
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: 'Could not load lessons',
        onRetry: () => ref.refresh(discoveryLessonsProvider),
      ),
      data: (lessons) {
        final filtered = query.isEmpty
            ? lessons
            : lessons.where((l) =>
                (l['title'] as String? ?? '').toLowerCase().contains(query)).toList();

        if (filtered.isEmpty) {
          return EmptyView(
            title: query.isNotEmpty ? 'No lessons found' : 'No published lessons',
            icon: Icons.menu_book_outlined,
          );
        }

        return RefreshIndicator(
          color: AppColors.brand,
          onRefresh: () => ref.refresh(discoveryLessonsProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _LessonCard(data: filtered[i]),
          ),
        );
      },
    );
  }
}

class _LessonCard extends StatelessWidget {
  const _LessonCard({required this.data});
  final Map<String, dynamic> data;

  static const _typeColors = {
    'video': Color(0xFF38BDF8),
    'live': AppColors.danger,
    'assignment': AppColors.accent,
    'note': AppColors.brand,
  };

  static const _typeIcons = {
    'video': Icons.play_circle_outline,
    'live': Icons.live_tv_outlined,
    'assignment': Icons.assignment_outlined,
    'note': Icons.menu_book_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final title = data['title'] as String? ?? 'Lesson';
    final type = data['lesson_type'] as String? ?? 'note';
    final id = data['id'] as int? ?? 0;
    final teacher = data['teacher'] as Map<String, dynamic>?;
    final color = _typeColors[type] ?? AppColors.brand;
    final icon = _typeIcons[type] ?? Icons.menu_book_outlined;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Theme.of(context).dividerColor),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/lessons/$id'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            type.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: color,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        if (teacher != null) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.person_outline, size: 11, color: Colors.grey[500]),
                          const SizedBox(width: 3),
                          Text(
                            teacher['full_name'] as String? ?? 'Teacher',
                            style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Shared Stat Widget ────────────────────────────────────────────
class _Stat extends StatelessWidget {
  const _Stat({
    required this.label,
    required this.value,
    required this.color,
    this.icon,
  });

  final String label;
  final String value;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 3),
        ],
        Text(
          value,
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: color),
        ),
        const SizedBox(width: 3),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: Colors.grey[500]),
        ),
      ],
    );
  }
}