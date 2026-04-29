import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../core/theme/app_colors.dart';
import '../../../models/class_model.dart';
import '../../../models/user.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/network/dio_client.dart';
import '../providers/classes_provider.dart';

const _kColors = [
  AppColors.brand, Color(0xFF38BDF8), AppColors.accent,
  AppColors.warning, Color(0xFF8B5CF6), Color(0xFF06B6D4), AppColors.danger,
];
Color _classColor(int id) => _kColors[id % _kColors.length];

class ClassDetailScreen extends ConsumerStatefulWidget {
  const ClassDetailScreen({required this.classId, super.key});
  final int classId;

  @override
  ConsumerState<ClassDetailScreen> createState() => _ClassDetailScreenState();
}

class _ClassDetailScreenState extends ConsumerState<ClassDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 3, vsync: this);
  bool _joining = false;
  bool _leaving = false;

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final clsAsync = ref.watch(classDetailProvider(widget.classId));
    final currentUser = ref.watch(currentUserProvider);

    return clsAsync.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(
          message: 'Could not load class',
          onRetry: () => ref.refresh(classDetailProvider(widget.classId)),
        ),
      ),
      data: (cls) {
        final color = _classColor(cls.id);
        final isOwner = currentUser?.id == cls.teacherId || (currentUser?.isAdmin ?? false);
        final isMember = cls.isMember ?? false;
        final canAccess = isOwner || isMember;

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              // ── SliverAppBar ──
              SliverAppBar(
                expandedHeight: 160,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(
                    cls.title,
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800),
                    maxLines: 1,
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
                    child: Center(child: Icon(Icons.class_outlined, size: 64, color: Colors.white.withValues(alpha: 0.25))),
                  ),
                ),
                actions: [
                  if (isOwner) ...[
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, color: Colors.white),
                      onPressed: () => _showEditSheet(context, cls),
                    ),
                  ],
                  IconButton(
                    icon: const Icon(Icons.share_outlined, color: Colors.white),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: 'Join my class ${cls.title}! Code: ${cls.classCode ?? ''}'));
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Class code copied!')));
                    },
                  ),
                ],
              ),

              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Info header ──
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Badges
                          Wrap(spacing: 6, runSpacing: 4, children: [
                            if (cls.classCode != null)
                              _Chip(label: cls.classCode!, color: Colors.grey),
                            if (cls.gradeLevel != null)
                              _Chip(label: cls.gradeLevel!, color: Colors.grey),
                            _Chip(
                              label: cls.isPublic ? '🌐 Public' : '🔒 Private',
                              color: cls.isPublic ? AppColors.accent : Colors.grey,
                            ),
                            _Chip(
                              label: cls.isActive ? '✅ Active' : '📦 Archived',
                              color: cls.isActive ? AppColors.accent : Colors.grey,
                            ),
                            if (isOwner) _Chip(label: '✏️ Owner', color: color),
                            if (isMember && !isOwner) _Chip(label: '✅ Enrolled', color: AppColors.accent),
                          ]),
                          const SizedBox(height: 10),

                          // Teacher
                          if (cls.teacherName != null)
                            Row(children: [
                              UserAvatar(name: cls.teacherName!, imageUrl: cls.teacherAvatar, radius: 14),
                              const SizedBox(width: 8),
                              Text('${cls.teacherName}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                                child: Text('Teacher', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
                              ),
                            ]),
                          const SizedBox(height: 8),

                          // Stats row
                          Row(children: [
                            _StatPill(icon: Icons.people_outline, label: '${cls.memberCount} students', color: color),
                            const SizedBox(width: 8),
                            _StatPill(icon: Icons.menu_book_outlined, label: '${cls.lessonCount} lessons', color: const Color(0xFF38BDF8)),
                          ]),

                          if (cls.description != null && cls.description!.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Text(cls.description!, style: const TextStyle(fontSize: 13, color: Colors.grey, height: 1.5)),
                          ],

                          // Join/Leave button
                          if (!isOwner) ...[
                            const SizedBox(height: 12),
                            if (!isMember)
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: _joining ? null : () => _join(cls),
                                  icon: _joining
                                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Icon(Icons.person_add_outlined, size: 16),
                                  label: Text(_joining ? 'Joining...' : 'Join Class'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: color, foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    elevation: 0,
                                  ),
                                ),
                              )
                            else
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton.icon(
                                  onPressed: _leaving ? null : () => _leave(cls),
                                  icon: const Icon(Icons.exit_to_app_outlined, size: 16),
                                  label: Text(_leaving ? 'Leaving...' : 'Leave Class'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.danger,
                                    side: const BorderSide(color: AppColors.danger),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ),
                          ],
                        ],
                      ),
                    ),

                    // ── Tabs (only if can access) ──
                    if (canAccess) ...[
                      TabBar(
                        controller: _tab,
                        labelColor: color,
                        indicatorColor: color,
                        unselectedLabelColor: Colors.grey,
                        tabs: const [
                          Tab(text: 'Lessons'),
                          Tab(text: 'Members'),
                          Tab(text: 'Discussion'),
                        ],
                      ),
                      SizedBox(
                        height: 500,
                        child: TabBarView(
                          controller: _tab,
                          children: [
                            _LessonsTab(classId: widget.classId, color: color),
                            _MembersTab(classId: widget.classId, color: color, isOwner: isOwner),
                            _DiscussionTab(classId: widget.classId, currentUser: currentUser),
                          ],
                        ),
                      ),
                    ] else
                      // Join wall
                      _JoinWall(cls: cls, onJoin: () => _join(cls), joining: _joining),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _join(ClassModel cls) async {
    if (cls.visibility == 'private') {
      final code = await _askForCode();
      if (code == null) return;
      setState(() => _joining = true);
      try {
        await ref.read(classesListProvider.notifier).joinClass(cls.id, code: code);
        ref.refresh(classDetailProvider(widget.classId));
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not join: $e'), backgroundColor: AppColors.danger));
      } finally {
        if (mounted) setState(() => _joining = false);
      }
    } else {
      setState(() => _joining = true);
      try {
        await ref.read(classesListProvider.notifier).joinClass(cls.id);
        ref.refresh(classDetailProvider(widget.classId));
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not join: $e'), backgroundColor: AppColors.danger));
      } finally {
        if (mounted) setState(() => _joining = false);
      }
    }
  }

  Future<void> _leave(ClassModel cls) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Leave class'),
        content: Text('Leave ${cls.title}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), style: TextButton.styleFrom(foregroundColor: AppColors.danger), child: const Text('Leave')),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() => _leaving = true);
    try {
      await ref.read(classesListProvider.notifier).leaveClass(cls.id);
      ref.refresh(classDetailProvider(widget.classId));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _leaving = false);
    }
  }

  Future<String?> _askForCode() async {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Enter class code'),
        content: TextField(controller: ctrl, decoration: const InputDecoration(hintText: 'Class code'), textCapitalization: TextCapitalization.characters),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, ctrl.text.trim()),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.brand, foregroundColor: Colors.white),
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }

  void _showEditSheet(BuildContext context, ClassModel cls) {
    // TODO: Edit sheet
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Edit coming soon')));
  }
}

// ── Lessons Tab ───────────────────────────────────────────────────
class _LessonsTab extends ConsumerWidget {
  const _LessonsTab({required this.classId, required this.color});
  final int classId;
  final Color color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(classLessonsProvider(classId));

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Could not load lessons', onRetry: () => ref.refresh(classLessonsProvider(classId))),
      data: (lessons) {
        if (lessons.isEmpty) {
          return const EmptyView(title: 'No lessons yet', icon: Icons.menu_book_outlined);
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: lessons.length,
          itemBuilder: (_, i) {
            final l = lessons[i];
            final type = l['lesson_type'] as String? ?? 'note';
            final typeColors = {'note': AppColors.brand, 'video': const Color(0xFF38BDF8), 'live': AppColors.danger, 'assignment': AppColors.accent};
            final typeIcons = {'note': Icons.menu_book_outlined, 'video': Icons.play_circle_outline, 'live': Icons.live_tv_outlined, 'assignment': Icons.assignment_outlined};
            final tColor = typeColors[type] ?? color;
            final tIcon = typeIcons[type] ?? Icons.menu_book_outlined;

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Theme.of(context).dividerColor)),
              child: ListTile(
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: tColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: Icon(tIcon, color: tColor, size: 20),
                ),
                title: Text(l['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                subtitle: Text('${type.toUpperCase()} · ${l['status'] ?? ''}', style: const TextStyle(fontSize: 11)),
                trailing: const Icon(Icons.chevron_right, color: Colors.grey, size: 18),
                onTap: () => context.push('/lessons/${l['id']}'),
              ),
            );
          },
        );
      },
    );
  }
}

// ── Members Tab ───────────────────────────────────────────────────
class _MembersTab extends ConsumerWidget {
  const _MembersTab({required this.classId, required this.color, required this.isOwner});
  final int classId;
  final Color color;
  final bool isOwner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(classMembersProvider(classId));

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Could not load members', onRetry: () => ref.refresh(classMembersProvider(classId))),
      data: (members) {
        if (members.isEmpty) {
          return const EmptyView(title: 'No members yet', icon: Icons.people_outline);
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: members.length,
          itemBuilder: (_, i) {
            final m = members[i];
            final roleColors = {'teacher': AppColors.brand, 'admin': AppColors.danger, 'learner': const Color(0xFF38BDF8)};
            final rColor = roleColors[m.role.name] ?? const Color(0xFF38BDF8);

            return ListTile(
              leading: UserAvatar(name: m.fullName, imageUrl: m.avatarUrl, radius: 20),
              title: Text(m.fullName, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(m.email, style: const TextStyle(fontSize: 11)),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: rColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                child: Text(m.role.label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: rColor)),
              ),
            );
          },
        );
      },
    );
  }
}

// ── Discussion Tab ─────────────────────────────────────────────────
class _DiscussionTab extends ConsumerStatefulWidget {
  const _DiscussionTab({required this.classId, required this.currentUser});
  final int classId;
  final User? currentUser;

  @override
  ConsumerState<_DiscussionTab> createState() => _DiscussionTabState();
}

class _DiscussionTabState extends ConsumerState<_DiscussionTab> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _sending = false;

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.brand, Color(0xFF8B5CF6)]),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.chat_outlined, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Class Discussion', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                    Text('Members only', style: TextStyle(fontSize: 10, color: Colors.grey)),
                  ],
                ),
              ),
              Row(children: [
                Container(width: 7, height: 7, decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle)),
                const SizedBox(width: 4),
                const Text('Live', style: TextStyle(fontSize: 10, color: AppColors.accent, fontWeight: FontWeight.w700)),
              ]),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: _ChatMessages(classId: widget.classId, currentUser: widget.currentUser, scrollCtrl: _scrollCtrl),
        ),

        // Input
        Container(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Row(
            children: [
              // Attach
              IconButton(
                icon: const Icon(Icons.attach_file_outlined, size: 20),
                color: Colors.grey,
                onPressed: () {},
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              // Input
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _msgCtrl,
                          decoration: const InputDecoration.collapsed(hintText: 'Message...'),
                          style: const TextStyle(fontSize: 15),
                          maxLines: null,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      GestureDetector(
                        onTap: () {},
                        child: const Text('😊', style: TextStyle(fontSize: 18)),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // Send
              GestureDetector(
                onTap: _sending ? null : _send,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: 38, height: 38,
                  decoration: BoxDecoration(
                    gradient: _msgCtrl.text.trim().isNotEmpty
                        ? const LinearGradient(colors: [AppColors.brand, Color(0xFF8B5CF6)])
                        : null,
                    color: _msgCtrl.text.trim().isEmpty ? Theme.of(context).dividerColor : null,
                    shape: BoxShape.circle,
                  ),
                  child: _sending
                      ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Icon(Icons.send_rounded, size: 16, color: _msgCtrl.text.trim().isNotEmpty ? Colors.white : Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    _msgCtrl.clear();
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/posts', data: {
        'content': text,
        'class_id': widget.classId,
        'post_type': 'text',
        'status': 'published',
        'visibility': 'class',
      });
      ref.refresh(chatMessagesProvider(widget.classId));
    } catch (_) {}
    finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

// ── Chat Messages ─────────────────────────────────────────────────
final chatMessagesProvider = FutureProvider.family<List<Map<String, dynamic>>, int>((ref, classId) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/posts', queryParameters: {'class_id': classId, 'limit': 50, 'sort_by': 'created_at', 'sort_order': 'asc'});
    final list = res.data is List ? res.data as List : (res.data['data'] as List? ?? res.data['items'] as List? ?? []);
    return list.cast<Map<String, dynamic>>();
  } catch (_) { return []; }
});

class _ChatMessages extends ConsumerWidget {
  const _ChatMessages({required this.classId, required this.currentUser, required this.scrollCtrl});
  final int classId;
  final User? currentUser;
  final ScrollController scrollCtrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(chatMessagesProvider(classId));

    return async.when(
      loading: () => const LoadingView(),
      error: (_, __) => const Center(child: Text('Could not load messages')),
      data: (messages) {
        if (messages.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.chat_bubble_outline, size: 40, color: Colors.grey.shade400),
                const SizedBox(height: 10),
                const Text('No messages yet', style: TextStyle(fontWeight: FontWeight.w700)),
                const Text('Start the class discussion!', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          );
        }

        return ListView.builder(
          controller: scrollCtrl,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          itemCount: messages.length,
          itemBuilder: (_, i) {
            final msg = messages[i];
            final author = msg['author'] as Map<String, dynamic>?;
            final authorId = author?['id'] as int? ?? msg['author_id'] as int? ?? msg['user_id'] as int?;
            final isMe = authorId == currentUser?.id;
            final name = author?['full_name'] as String? ?? 'User';
            final role = author?['role'] as String? ?? 'learner';
            final content = msg['content'] as String? ?? '';
            final createdAt = msg['created_at'] as String?;

            final roleColors = {'teacher': AppColors.brand, 'admin': AppColors.danger, 'learner': const Color(0xFF38BDF8)};
            final nameColor = roleColors[role] ?? const Color(0xFF38BDF8);

            final prevMsg = i > 0 ? messages[i - 1] : null;
            final prevAuthorId = prevMsg?['author']?['id'] ?? prevMsg?['user_id'];
            final showAvatar = !isMe && prevAuthorId != authorId;

            return Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Row(
                mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Avatar placeholder for alignment
                  if (!isMe) ...[
                    SizedBox(
                      width: 28,
                      child: showAvatar ? UserAvatar(name: name, radius: 14) : null,
                    ),
                    const SizedBox(width: 5),
                  ],

                  Column(
                    crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                    children: [
                      if (showAvatar && !isMe)
                        Padding(
                          padding: const EdgeInsets.only(left: 4, bottom: 2),
                          child: Text(name, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: nameColor)),
                        ),
                      Container(
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        decoration: BoxDecoration(
                          gradient: isMe ? const LinearGradient(colors: [AppColors.brand, Color(0xFF8B5CF6)]) : null,
                          color: isMe ? null : Theme.of(context).cardColor,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(isMe ? 16 : 3),
                            bottomRight: Radius.circular(isMe ? 3 : 16),
                          ),
                          border: isMe ? null : Border.all(color: Theme.of(context).dividerColor),
                        ),
                        child: Text(
                          content,
                          style: TextStyle(fontSize: 14, color: isMe ? Colors.white : null, height: 1.4),
                        ),
                      ),
                      if (createdAt != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
                          child: Text(
                            timeago.format(DateTime.parse(createdAt)),
                            style: const TextStyle(fontSize: 9, color: Colors.grey),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

// ── Join Wall ─────────────────────────────────────────────────────
class _JoinWall extends StatelessWidget {
  const _JoinWall({required this.cls, required this.onJoin, required this.joining});
  final ClassModel cls;
  final VoidCallback onJoin;
  final bool joining;

  @override
  Widget build(BuildContext context) {
    final color = _classColor(cls.id);
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              border: Border.all(color: color.withValues(alpha: 0.25), width: 2),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.lock_outline, color: color, size: 32),
          ),
          const SizedBox(height: 16),
          const Text('Members only', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(
            'Join ${cls.title} to access lessons, discussions, and resources.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey, fontSize: 14, height: 1.6),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: joining ? null : onJoin,
            icon: joining
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.person_add_outlined),
            label: Text(joining ? 'Joining...' : 'Join Class'),
            style: ElevatedButton.styleFrom(
              backgroundColor: color, foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _FeaturePill(icon: '📜', label: 'All lessons'),
              const SizedBox(width: 16),
              _FeaturePill(icon: '💬', label: 'Discussion'),
              const SizedBox(width: 16),
              _FeaturePill(icon: '📋', label: 'Quizzes'),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  const _FeaturePill({required this.icon, required this.label});
  final String icon, label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(icon, style: const TextStyle(fontSize: 24)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }
}

// ── Shared Widgets ────────────────────────────────────────────────
class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({required this.icon, required this.label, required this.color});
  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
      ],
    );
  }
}