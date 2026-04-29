import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../models/lesson.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../providers/lessons_provider.dart';

class LessonDetailScreen extends ConsumerWidget {
  const LessonDetailScreen({required this.lessonId, super.key});
  final int lessonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(lessonDetailProvider(lessonId));

    return async.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(
          message: 'Could not load lesson',
          onRetry: () => ref.refresh(lessonDetailProvider(lessonId)),
        ),
      ),
      data: (lesson) => _LessonView(lesson: lesson),
    );
  }
}

class _LessonView extends StatelessWidget {
  const _LessonView({required this.lesson});
  final Lesson lesson;

  static const _typeColors = {
    LessonType.video: Color(0xFF38BDF8),
    LessonType.live: AppColors.danger,
    LessonType.assignment: AppColors.accent,
    LessonType.note: AppColors.brand,
    LessonType.slide: Color(0xFF8B5CF6),
    LessonType.reading: Color(0xFFF59E0B),
  };

  static const _typeIcons = {
    LessonType.video: Icons.play_circle_outline,
    LessonType.live: Icons.live_tv_outlined,
    LessonType.assignment: Icons.assignment_outlined,
    LessonType.note: Icons.menu_book_outlined,
    LessonType.slide: Icons.slideshow_outlined,
    LessonType.reading: Icons.book_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final color = _typeColors[lesson.lessonType] ?? AppColors.brand;
    final icon = _typeIcons[lesson.lessonType] ?? Icons.menu_book_outlined;
    final theme = Theme.of(context);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App bar with gradient
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                lesson.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [color, color.withValues(alpha: 0.7)],
                  ),
                ),
                child: Center(
                  child: Icon(icon, size: 64, color: Colors.white.withValues(alpha: 0.3)),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.share_outlined, color: Colors.white),
                onPressed: () {
                  Clipboard.setData(ClipboardData(
                    text: 'https://www.learn-ex.online/lessons/${lesson.id}',
                  ));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Link copied to clipboard')),
                  );
                },
              ),
            ],
          ),

          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Meta chips
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _Chip(
                        label: lesson.lessonType.label.toUpperCase(),
                        color: color,
                        icon: icon,
                      ),
                      _Chip(
                        label: lesson.status.toUpperCase(),
                        color: lesson.isPublished ? AppColors.accent : Colors.grey,
                        icon: lesson.isPublished
                            ? Icons.check_circle_outline
                            : Icons.pending_outlined,
                      ),
                      _Chip(
                        label: lesson.isPublic ? 'PUBLIC' : 'CLASS ONLY',
                        color: lesson.isPublic ? Colors.blue : Colors.grey,
                        icon: lesson.isPublic ? Icons.public : Icons.lock_outline,
                      ),
                    ],
                  ),
                ),

                // Teacher info
                if (lesson.teacherName != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Row(
                      children: [
                        UserAvatar(
                          name: lesson.teacherName!,
                          imageUrl: lesson.teacherAvatar,
                          radius: 16,
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              lesson.teacherName!,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            if (lesson.createdAt != null)
                              Text(
                                timeago.format(lesson.createdAt!),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: theme.textTheme.bodySmall?.color,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                // Description
                if (lesson.description != null && lesson.description!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Text(
                      lesson.description!,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.textTheme.bodySmall?.color,
                        height: 1.5,
                      ),
                    ),
                  ),

                // Class + Subject info
                if (lesson.className != null || lesson.subjectName != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Row(
                      children: [
                        if (lesson.className != null) ...[
                          const Icon(Icons.class_outlined, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(
                            lesson.className!,
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (lesson.subjectName != null) ...[
                          const Icon(Icons.book_outlined, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(
                            lesson.subjectName!,
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ],
                    ),
                  ),

                const Divider(height: 24),

                // Content
                if (lesson.content != null && lesson.content!.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Text(
                      'Content',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Html(
                      data: lesson.content!,
                      style: {
                        'body': Style(
                          fontSize: FontSize(15),
                          lineHeight: const LineHeight(1.7),
                          color: theme.textTheme.bodyLarge?.color,
                          margin: Margins.zero,
                          padding: HtmlPaddings.zero,
                        ),
                        'h1': Style(
                          fontSize: FontSize(22),
                          fontWeight: FontWeight.w800,
                          color: theme.textTheme.headlineMedium?.color,
                        ),
                        'h2': Style(
                          fontSize: FontSize(18),
                          fontWeight: FontWeight.w700,
                          color: theme.textTheme.headlineSmall?.color,
                        ),
                        'h3': Style(
                          fontSize: FontSize(16),
                          fontWeight: FontWeight.w600,
                        ),
                        'blockquote': Style(
                          border: Border(
                            left: BorderSide(color: color, width: 3),
                          ),
                          padding: HtmlPaddings.only(left: 12),
                          color: Colors.grey,
                        ),
                        'code': Style(
                          backgroundColor: theme.brightness == Brightness.dark
                              ? const Color(0xFF27272A)
                              : const Color(0xFFF4F4F5),
                          padding: HtmlPaddings.symmetric(horizontal: 6, vertical: 2),
                          fontFamily: 'monospace',
                          fontSize: FontSize(13),
                        ),
                        'a': Style(color: color),
                      },
                      onLinkTap: (url, _, __) {
                        if (url != null) launchUrl(Uri.parse(url));
                      },
                    ),
                  ),
                ],

                // Resources
                if (lesson.resources.isNotEmpty) ...[
                  const Divider(height: 24),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Text(
                      'Resources',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  ...lesson.resources.map((r) {
                    final res = r as Map<String, dynamic>;
                    final title = res['title'] as String? ?? 'Resource';
                    final url = res['url'] as String? ?? '';
                    return ListTile(
                      leading: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.attach_file, color: color, size: 18),
                      ),
                      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                      trailing: const Icon(Icons.open_in_new, size: 16, color: Colors.grey),
                      onTap: () => launchUrl(Uri.parse(url)),
                    );
                  }),
                ],

                const SizedBox(height: 48),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.color,
    required this.icon,
  });

  final String label;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: color,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}