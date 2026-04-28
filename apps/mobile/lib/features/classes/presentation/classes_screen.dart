import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../models/class_model.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/classes_provider.dart';

class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key});

  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this);

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Classes'),
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.brand,
          indicatorColor: AppColors.brand,
          tabs: const [
            Tab(text: 'My classes'),
            Tab(text: 'Discover'),
          ],
        ),
      ),
      floatingActionButton: (user?.isTeacher ?? false)
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.brand,
              onPressed: () {},
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('New class',
                  style: TextStyle(color: Colors.white)),
            )
          : null,
      body: TabBarView(
        controller: _tab,
        children: const [
          _ClassesList(provider: 'mine'),
          _ClassesList(provider: 'public'),
        ],
      ),
    );
  }
}

class _ClassesList extends ConsumerWidget {
  const _ClassesList({required this.provider});
  final String provider; // 'mine' or 'public'

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async =
        provider == 'mine' ? ref.watch(myClassesProvider) : ref.watch(publicClassesProvider);

    return async.when(
      data: (classes) {
        if (classes.isEmpty) {
          return EmptyView(
            title: provider == 'mine'
                ? 'No classes yet'
                : 'No public classes available',
            subtitle: provider == 'mine'
                ? 'Join a class or create your own to get started.'
                : 'Check back soon for newly published classes.',
            icon: Icons.class_outlined,
          );
        }
        return RefreshIndicator(
          color: AppColors.brand,
          onRefresh: () async => provider == 'mine'
              ? ref.refresh(myClassesProvider.future)
              : ref.refresh(publicClassesProvider.future),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(12),
            itemCount: classes.length,
            itemBuilder: (_, i) => ClassCard(classModel: classes[i]),
          ),
        );
      },
      error: (e, _) => ErrorView(
        message: 'Failed to load classes',
        onRetry: () => provider == 'mine'
            ? ref.refresh(myClassesProvider.future)
            : ref.refresh(publicClassesProvider.future),
      ),
      loading: () => const LoadingView(),
    );
  }
}

class ClassCard extends StatelessWidget {
  const ClassCard({required this.classModel, super.key});
  final ClassModel classModel;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => context.push('/classes/${classModel.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.brand, AppColors.brandDark],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.class_, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            classModel.name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (!classModel.isPublic)
                          const Icon(Icons.lock_outline, size: 14),
                      ],
                    ),
                    if (classModel.subjectName != null ||
                        classModel.gradeLevel != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        [
                          if (classModel.subjectName != null)
                            classModel.subjectName!,
                          if (classModel.gradeLevel != null)
                            classModel.gradeLevel!,
                        ].join(' · '),
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.people_outline, size: 14),
                        const SizedBox(width: 4),
                        Text('${classModel.memberCount}',
                            style: const TextStyle(fontSize: 12)),
                        const SizedBox(width: 12),
                        const Icon(Icons.menu_book_outlined, size: 14),
                        const SizedBox(width: 4),
                        Text('${classModel.lessonCount}',
                            style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
