import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../providers/lessons_provider.dart';

class LessonDetailScreen extends ConsumerWidget {
  const LessonDetailScreen({required this.lessonId, super.key});
  final int lessonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(lessonDetailProvider(lessonId));

    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            icon: const Icon(Icons.bookmark_border),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: async.when(
        data: (lesson) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                lesson.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                    ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (lesson.subjectName != null)
                    _MetaChip(label: lesson.subjectName!),
                  if (lesson.gradeLevel != null)
                    _MetaChip(label: lesson.gradeLevel!),
                  if (lesson.className != null)
                    _MetaChip(label: lesson.className!),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  UserAvatar(
                    imageUrl: lesson.authorAvatar,
                    name: lesson.authorName,
                    radius: 18,
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lesson.authorName ?? 'Unknown',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        'Teacher',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),
              if (lesson.content != null && lesson.content!.isNotEmpty)
                Html(data: lesson.content!)
              else
                Text(
                  lesson.summary ?? 'No content available',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
            ],
          ),
        ),
        error: (e, _) => ErrorView(
          message: 'Could not load lesson',
          onRetry: () => ref.refresh(lessonDetailProvider(lessonId).future),
        ),
        loading: () => const LoadingView(),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.brand,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
