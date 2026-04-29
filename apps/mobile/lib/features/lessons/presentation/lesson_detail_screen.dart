import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:url_launcher/url_launcher.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/lesson.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/lessons_provider.dart';

// ── Comment model ─────────────────────────────────────────────────
class LessonComment {
  const LessonComment({
    required this.id,
    required this.content,
    required this.authorName,
    required this.authorRole,
    required this.createdAt,
    this.authorAvatar,
  });

  final int id;
  final String content;
  final String authorName;
  final String authorRole;
  final String? authorAvatar;
  final DateTime createdAt;

  factory LessonComment.fromJson(Map<String, dynamic> j) {
    final author = j['author'] as Map<String, dynamic>? ?? {};
    return LessonComment(
      id: j['id'] as int? ?? 0,
      content: j['content'] as String? ?? '',
      authorName: author['full_name'] as String? ?? 'Unknown',
      authorRole: author['role'] as String? ?? 'learner',
      authorAvatar: author['avatar_url'] as String?,
      createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

final lessonCommentsProvider = FutureProvider.family<List<LessonComment>, int>((ref, id) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/posts?class_id=&lesson_id=$id&limit=50&sort_by=created_at&sort_order=asc');
    final list = res.data is List ? res.data as List : (res.data['data'] as List? ?? []);
    return list.map((e) => LessonComment.fromJson(e as Map<String, dynamic>)).toList();
  } catch (_) {
    return [];
  }
});

// ── Main Screen ───────────────────────────────────────────────────
class LessonDetailScreen extends ConsumerStatefulWidget {
  const LessonDetailScreen({required this.lessonId, super.key});
  final int lessonId;

  @override
  ConsumerState<LessonDetailScreen> createState() => _LessonDetailScreenState();
}

class _LessonDetailScreenState extends ConsumerState<LessonDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 3, vsync: this);
  final _commentCtrl = TextEditingController();
  bool _sending = false;

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
  void dispose() {
    _tab.dispose();
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendComment(int lessonId) async {
    final text = _commentCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/posts', data: {
        'content': text,
        'post_type': 'text',
        'status': 'published',
        'visibility': 'public',
      });
      _commentCtrl.clear();
      ref.invalidate(lessonCommentsProvider(lessonId));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send message')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(lessonDetailProvider(widget.lessonId));
    final user = ref.watch(currentUserProvider);

    return async.when(
      loading: () => Scaffold(
        appBar: AppBar(),
        body: const LoadingView(),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(
          message: 'Could not load lesson',
          onRetry: () => ref.refresh(lessonDetailProvider(widget.lessonId)),
        ),
      ),
      data: (lesson) {
        final type = lesson.lessonType;
        final color = _typeColors[type] ?? AppColors.brand;
        final icon = _typeIcons[type] ?? Icons.menu_book_outlined;
        final canEdit = user?.isTeacher == true || user?.role.name == 'admin';

        return Scaffold(
          appBar: AppBar(
            title: Text(lesson.title, overflow: TextOverflow.ellipsis),
            actions: [
              IconButton(
                icon: const Icon(Icons.share_outlined),
                onPressed: () {
                  Clipboard.setData(ClipboardData(
                    text: 'https://www.learn-ex.online/lessons/${lesson.id}',
                  ));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Link copied!')),
                  );
                },
              ),
              if (canEdit)
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () {},
                ),
            ],
            bottom: TabBar(
              controller: _tab,
              labelColor: color,
              indicatorColor: color,
              tabs: const [
                Tab(text: 'Content'),
                Tab(text: 'Discussion'),
                Tab(text: 'Resources'),
              ],
            ),
          ),
          body: Column(
            children: [
              // Lesson header card
              _LessonHeader(lesson: lesson, color: color, icon: icon),
              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tab,
                  children: [
                    // Content tab
                    _ContentTab(lesson: lesson),
                    // Discussion tab
                    _DiscussionTab(
                      lessonId: lesson.id,
                      commentCtrl: _commentCtrl,
                      sending: _sending,
                      onSend: () => _sendComment(lesson.id),
                    ),
                    // Resources tab
                    _ResourcesTab(lesson: lesson),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ── Lesson Header ─────────────────────────────────────────────────
class _LessonHeader extends StatelessWidget {
  const _LessonHeader({
    required this.lesson,
    required this.color,
    required this.icon,
  });

  final Lesson lesson;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (lesson.description?.isNotEmpty == true)
                  Text(
                    lesson.description!,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  children: [
                    _Chip(
                      label: lesson.lessonType.toUpperCase(),
                      color: color,
                    ),
                    _Chip(
                      label: lesson.status.toUpperCase(),
                      color: lesson.status == 'published'
                          ? AppColors.accent
                          : Colors.grey,
                    ),
                    _Chip(
                      label: lesson.visibility == 'public' ? 'Public' : 'Class',
                      color: Colors.grey,
                      icon: lesson.visibility == 'public'
                          ? Icons.public
                          : Icons.lock_outline,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color, this.icon});
  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 10, color: color),
            const SizedBox(width: 3),
          ],
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

// ── Content Tab ───────────────────────────────────────────────────
class _ContentTab extends StatelessWidget {
  const _ContentTab({required this.lesson});
  final Lesson lesson;

  String _markdownToHtml(String md) {
    var html = md
        .replaceAllMapped(RegExp(r'^## (.+)$', multiLine: true),
            (m) => '<h2>${m[1]}</h2>')
        .replaceAllMapped(RegExp(r'^### (.+)$', multiLine: true),
            (m) => '<h3>${m[1]}</h3>')
        .replaceAllMapped(RegExp(r'^# (.+)$', multiLine: true),
            (m) => '<h1>${m[1]}</h1>')
        .replaceAllMapped(RegExp(r'\*\*(.+?)\*\*'),
            (m) => '<strong>${m[1]}</strong>')
        .replaceAllMapped(
            RegExp(r'\*(.+?)\*'), (m) => '<em>${m[1]}</em>')
        .replaceAllMapped(RegExp(r'^[-*] (.+)$', multiLine: true),
            (m) => '<li>${m[1]}</li>')
        .replaceAllMapped(RegExp(r'^\d+\. (.+)$', multiLine: true),
            (m) => '<li>${m[1]}</li>')
        .replaceAll(RegExp(r'\n\n'), '</p><p>')
        .replaceAll('\n', '<br>');
    return '<p>$html</p>';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? '#F4F4F5' : '#111827';
    final headingColor = isDark ? '#FFFFFF' : '#000000';

    if (lesson.content == null || lesson.content!.isEmpty) {
      return const EmptyView(
        title: 'No content yet',
        subtitle: 'The teacher has not added content to this lesson.',
        icon: Icons.menu_book_outlined,
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Html(
        data: _markdownToHtml(lesson.content!),
        style: {
          'body': Style(
            fontSize: FontSize(15),
            lineHeight: const LineHeight(1.8),
            color: HtmlColor.parse(textColor),
            margin: Margins.zero,
            padding: HtmlPaddings.zero,
          ),
          'h1': Style(
            fontSize: FontSize(22),
            fontWeight: FontWeight.w800,
            color: HtmlColor.parse(headingColor),
            margin: Margins.only(top: 20, bottom: 8),
          ),
          'h2': Style(
            fontSize: FontSize(18),
            fontWeight: FontWeight.w700,
            color: HtmlColor.parse(headingColor),
            margin: Margins.only(top: 16, bottom: 6),
          ),
          'h3': Style(
            fontSize: FontSize(16),
            fontWeight: FontWeight.w700,
            color: HtmlColor.parse(headingColor),
            margin: Margins.only(top: 12, bottom: 4),
          ),
          'li': Style(
            fontSize: FontSize(15),
            lineHeight: const LineHeight(1.8),
            margin: Margins.only(bottom: 4),
          ),
          'strong': Style(fontWeight: FontWeight.w700),
          'blockquote': Style(
            padding: HtmlPaddings.symmetric(horizontal: 16, vertical: 8),
            margin: Margins.symmetric(vertical: 8),
            border: const Border(
              left: BorderSide(color: AppColors.brand, width: 3),
            ),
          ),
          'code': Style(
            fontFamily: 'monospace',
            backgroundColor: HtmlColor.parse(isDark ? '#27272A' : '#F4F4F5'),
            padding: HtmlPaddings.symmetric(horizontal: 6, vertical: 2),
          ),
        },
        onLinkTap: (url, _, __) async {
          if (url != null) {
            final uri = Uri.tryParse(url);
            if (uri != null) await launchUrl(uri);
          }
        },
      ),
    );
  }
}

// ── Discussion Tab ────────────────────────────────────────────────
class _DiscussionTab extends ConsumerWidget {
  const _DiscussionTab({
    required this.lessonId,
    required this.commentCtrl,
    required this.sending,
    required this.onSend,
  });

  final int lessonId;
  final TextEditingController commentCtrl;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(lessonCommentsProvider(lessonId));
    final user = ref.watch(currentUserProvider);

    return Column(
      children: [
        Expanded(
          child: async.when(
            loading: () => const LoadingView(),
            error: (_, __) => const EmptyView(
              title: 'Could not load discussion',
              icon: Icons.chat_bubble_outline,
            ),
            data: (comments) {
              if (comments.isEmpty) {
                return const EmptyView(
                  title: 'No messages yet',
                  subtitle: 'Start the discussion!',
                  icon: Icons.chat_bubble_outline,
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: comments.length,
                itemBuilder: (_, i) {
                  final c = comments[i];
                  final isMe = c.authorName == user?.fullName;
                  return _CommentBubble(comment: c, isMe: isMe);
                },
              );
            },
          ),
        ),
        // Input bar
        Container(
          padding: EdgeInsets.fromLTRB(
            12, 8, 12, MediaQuery.of(context).viewInsets.bottom + 8),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Row(
            children: [
              if (user != null)
                UserAvatar(name: user.fullName, radius: 16),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: commentCtrl,
                  decoration: InputDecoration(
                    hintText: 'Add to discussion...',
                    filled: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    isDense: true,
                  ),
                  maxLines: null,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => onSend(),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: sending ? null : onSend,
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.brand, Color(0xFF8B5CF6)],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: sending
                      ? const Padding(
                          padding: EdgeInsets.all(10),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CommentBubble extends StatelessWidget {
  const _CommentBubble({required this.comment, required this.isMe});
  final LessonComment comment;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isMe) ...[
            UserAvatar(name: comment.authorName, radius: 14),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 2),
                    child: Text(
                      comment.authorName,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.brand,
                      ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
                  decoration: BoxDecoration(
                    gradient: isMe
                        ? const LinearGradient(
                            colors: [AppColors.brand, Color(0xFF8B5CF6)],
                          )
                        : null,
                    color: isMe ? null : Theme.of(context).cardColor,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                    border: isMe
                        ? null
                        : Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Text(
                    comment.content,
                    style: TextStyle(
                      fontSize: 14,
                      color: isMe ? Colors.white : null,
                      height: 1.4,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
                  child: Text(
                    timeago.format(comment.createdAt, locale: 'en_short'),
                    style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                  ),
                ),
              ],
            ),
          ),
          if (isMe) const SizedBox(width: 6),
        ],
      ),
    );
  }
}

// ── Resources Tab ─────────────────────────────────────────────────
class _ResourcesTab extends StatelessWidget {
  const _ResourcesTab({required this.lesson});
  final Lesson lesson;

  @override
  Widget build(BuildContext context) {
    final resources = lesson.resources;

    if (resources == null || resources.isEmpty) {
      return const EmptyView(
        title: 'No resources',
        subtitle: 'The teacher has not added any resources yet.',
        icon: Icons.attach_file_outlined,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: resources.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final r = resources[i];
        final url = r['url'] as String? ?? '';
        final name = r['name'] as String? ?? 'Resource ${i + 1}';
        final type = r['type'] as String? ?? 'file';

        IconData icon;
        Color color;
        switch (type) {
          case 'video':
            icon = Icons.play_circle_outline;
            color = const Color(0xFF38BDF8);
          case 'pdf':
            icon = Icons.picture_as_pdf_outlined;
            color = AppColors.danger;
          case 'link':
            icon = Icons.link;
            color = AppColors.brand;
          default:
            icon = Icons.attach_file_outlined;
            color = Colors.grey;
        }

        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Theme.of(context).dividerColor),
          ),
          child: ListTile(
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(
              url.length > 40 ? '${url.substring(0, 40)}...' : url,
              style: const TextStyle(fontSize: 11),
            ),
            trailing: const Icon(Icons.open_in_new, size: 16),
            onTap: () async {
              final uri = Uri.tryParse(url);
              if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
            },
          ),
        );
      },
    );
  }
}