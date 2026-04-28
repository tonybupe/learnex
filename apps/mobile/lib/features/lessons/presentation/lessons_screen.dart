import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../models/lesson.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/lessons_provider.dart';
import 'ai_generate_lesson_sheet.dart';

class LessonsScreen extends ConsumerWidget {
  const LessonsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final async = ref.watch(lessonsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Lessons')),
      floatingActionButton: (user?.isTeacher ?? false)
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.brand,
              icon: const Icon(Icons.auto_awesome, color: Colors.white),
              label: const Text('AI generate',
                  style: TextStyle(color: Colors.white)),
              onPressed: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                useSafeArea: true,
                builder: (_) => const AiGenerateLessonSheet(),
              ),
            )
          : null,
      body: async.when(
        data: (lessons) {
          if (lessons.isEmpty) {
            return const EmptyView(
              title: 'No lessons yet',
              subtitle: 'Published lessons will appear here.',
              icon: Icons.menu_book_outlined,
            );
          }
          return RefreshIndicator(
            color: AppColors.brand,
            onRefresh: () async => ref.refresh(lessonsListProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: lessons.length,
              itemBuilder: (_, i) => _LessonCard(lesson: lessons[i]),
            ),
          );
        },
        error: (e, _) => ErrorView(
          message: 'Could not load lessons',
          onRetry: () => ref.refresh(lessonsListProvider.future),
        ),
        loading: () => const LoadingView(),
      ),
    );
  }
}

class _LessonCard extends StatelessWidget {
  const _LessonCard({required this.lesson});
  final Lesson lesson;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => context.push('/lessons/${lesson.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.brand.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  switch (lesson.lessonType) {
                    LessonType.slide => Icons.slideshow,
                    LessonType.video => Icons.play_circle_outline,
                    LessonType.reading => Icons.article_outlined,
                    LessonType.note => Icons.note_outlined,
                  },
                  color: AppColors.brand,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lesson.title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (lesson.summary != null)
                      Text(
                        lesson.summary!,
                        style: const TextStyle(fontSize: 13),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        if (lesson.subjectName != null)
                          _Chip(text: lesson.subjectName!),
                        if (lesson.gradeLevel != null)
                          _Chip(text: lesson.gradeLevel!),
                        if (lesson.className != null)
                          _Chip(text: lesson.className!),
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

class _Chip extends StatelessWidget {
  const _Chip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 11, color: AppColors.brand),
      ),
    );
  }
}
