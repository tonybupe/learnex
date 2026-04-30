import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/lesson.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/lessons_provider.dart';

// ── Type config matching web ──────────────────────────────────────
const _typeColors = {
  'note':       AppColors.brand,
  'video':      Color(0xFF38BDF8),
  'live':       AppColors.danger,
  'assignment': AppColors.accent,
  'slide':      Color(0xFF8B5CF6),
  'reading':    AppColors.warning,
};
const _typeIcons = {
  'note':       Icons.menu_book_outlined,
  'video':      Icons.play_circle_outline,
  'live':       Icons.live_tv_outlined,
  'assignment': Icons.assignment_outlined,
  'slide':      Icons.slideshow_outlined,
  'reading':    Icons.book_outlined,
};
const _typeEmojis = {
  'note': '📋', 'video': '🎥', 'live': '🔴',
  'assignment': '📏', 'slide': '📊', 'reading': '📖',
};

Color _tColor(String t) => _typeColors[t] ?? AppColors.brand;
IconData _tIcon(String t) => _typeIcons[t] ?? Icons.menu_book_outlined;
String _tEmoji(String t) => _typeEmojis[t] ?? '📄';

// ── Discussion provider ───────────────────────────────────────────
final lessonDiscussionProvider =
    FutureProvider.family<List<Map<String, dynamic>>, int>((ref, id) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/lessons/$id/discussion');
    final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
    return list.cast<Map<String, dynamic>>();
  } catch (_) { return []; }
});

// ── Screen ────────────────────────────────────────────────────────
class LessonDetailScreen extends ConsumerStatefulWidget {
  const LessonDetailScreen({required this.lessonId, super.key});
  final int lessonId;

  @override
  ConsumerState<LessonDetailScreen> createState() => _LessonDetailScreenState();
}

class _LessonDetailScreenState extends ConsumerState<LessonDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 3, vsync: this);
  bool _editing = false;

  // Edit form state
  late Map<String, String> _editForm;
  bool _saving = false;
  String _saveStatus = 'idle'; // idle | saving | saved | error

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  void _initEditForm(Lesson l) {
    _editForm = {
      'title': l.title,
      'description': l.description ?? '',
      'content': l.content ?? '',
      'status': l.status,
      'visibility': l.visibility,
      'lesson_type': l.lessonType.name,
    };
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(lessonDetailProvider(widget.lessonId));
    final currentUser = ref.watch(currentUserProvider);

    return async.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorView(message: 'Could not load lesson', onRetry: () => ref.refresh(lessonDetailProvider(widget.lessonId))),
      ),
      data: (lesson) {
        final canEdit = (currentUser?.isTeacher == true && lesson.teacherId == currentUser?.id) || (currentUser?.isAdmin ?? false);
        final type = lesson.lessonType.name;
        final color = _tColor(type);

        return Scaffold(
          appBar: AppBar(
            title: Text(lesson.title, overflow: TextOverflow.ellipsis),
            actions: [
              if (canEdit && !_editing)
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () {
                    _initEditForm(lesson);
                    setState(() => _editing = true);
                  },
                ),
              IconButton(
                icon: const Icon(Icons.share_outlined),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: 'https://www.learn-ex.online/lessons/${lesson.id}'));
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link copied!')));
                },
              ),
              IconButton(
                icon: const Icon(Icons.bookmark_border_outlined),
                onPressed: () {},
              ),
            ],
          ),
          body: _editing
              ? _EditingView(
                  lesson: lesson,
                  editForm: _editForm,
                  saving: _saving,
                  saveStatus: _saveStatus,
                  onFormChange: (key, val) => setState(() => _editForm[key] = val),
                  onCancel: () => setState(() => _editing = false),
                  onSave: () => _save(lesson.id),
                )
              : _ViewMode(
                  lesson: lesson,
                  tab: _tab,
                  currentUser: currentUser,
                  canEdit: canEdit,
                  onEdit: () { _initEditForm(lesson); setState(() => _editing = true); },
                ),
        );
      },
    );
  }

  Future<void> _save(int lessonId) async {
    setState(() { _saving = true; _saveStatus = 'saving'; });
    try {
      final dio = ref.read(dioProvider);
      await dio.patch('/lessons/$lessonId', data: _editForm);
      ref.refresh(lessonDetailProvider(lessonId));
      ref.refresh(lessonsListProvider);
      setState(() { _saveStatus = 'saved'; });
      await Future.delayed(const Duration(milliseconds: 1200));
      if (mounted) setState(() { _saving = false; _saveStatus = 'idle'; _editing = false; });
    } catch (e) {
      setState(() { _saving = false; _saveStatus = 'error'; });
      await Future.delayed(const Duration(milliseconds: 2000));
      if (mounted) setState(() => _saveStatus = 'idle');
    }
  }
}

// ── Editing View ──────────────────────────────────────────────────
class _EditingView extends StatefulWidget {
  const _EditingView({
    required this.lesson, required this.editForm, required this.saving,
    required this.saveStatus, required this.onFormChange,
    required this.onCancel, required this.onSave,
  });
  final Lesson lesson;
  final Map<String, String> editForm;
  final bool saving;
  final String saveStatus;
  final void Function(String, String) onFormChange;
  final VoidCallback onCancel;
  final VoidCallback onSave;

  @override
  State<_EditingView> createState() => _EditingViewState();
}

class _EditingViewState extends State<_EditingView> {
  late final TextEditingController _titleCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _contentCtrl;

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.editForm['title']);
    _descCtrl = TextEditingController(text: widget.editForm['description']);
    _contentCtrl = TextEditingController(text: widget.editForm['content']);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = _tColor(widget.editForm['lesson_type'] ?? 'note');

    return Column(
      children: [
        // Edit header bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Row(
            children: [
              Icon(Icons.edit_outlined, size: 16, color: AppColors.brand),
              const SizedBox(width: 8),
              const Text('Editing Lesson', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              const Spacer(),
              // Save status
              if (widget.saveStatus == 'saving')
                const Text('Saving...', style: TextStyle(fontSize: 12, color: Colors.grey)),
              if (widget.saveStatus == 'saved')
                const Row(children: [
                  Icon(Icons.check_circle, size: 13, color: AppColors.accent),
                  SizedBox(width: 4),
                  Text('Saved', style: TextStyle(fontSize: 12, color: AppColors.accent)),
                ]),
              if (widget.saveStatus == 'error')
                const Text('Save failed', style: TextStyle(fontSize: 12, color: AppColors.danger)),
              const SizedBox(width: 8),
              TextButton(onPressed: widget.onCancel, child: const Text('Cancel')),
              const SizedBox(width: 4),
              ElevatedButton.icon(
                onPressed: widget.saving ? null : widget.onSave,
                icon: widget.saving
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_outlined, size: 14),
                label: Text(widget.saving ? 'Saving...' : 'Save'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand, foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
              ),
            ],
          ),
        ),

        // Form
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Title
                _FormField(
                  label: 'Title',
                  child: TextField(
                    controller: _titleCtrl,
                    onChanged: (v) => widget.onFormChange('title', v),
                    decoration: const InputDecoration(hintText: 'Lesson title...'),
                  ),
                ),
                const SizedBox(height: 12),

                // Description
                _FormField(
                  label: 'Description',
                  child: TextField(
                    controller: _descCtrl,
                    onChanged: (v) => widget.onFormChange('description', v),
                    decoration: const InputDecoration(hintText: 'Brief overview...'),
                  ),
                ),
                const SizedBox(height: 12),

                // Type + Status + Visibility - stacked to avoid overflow
                Row(children: [
                  Expanded(child: _FormField(
                    label: 'Type',
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: widget.editForm['lesson_type'],
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                      items: const [
                        DropdownMenuItem(value: 'note', child: Text('📋 Note', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'video', child: Text('🎥 Video', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'live', child: Text('🔴 Live', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'assignment', child: Text('📏 Assign', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (v) { if (v != null) widget.onFormChange('lesson_type', v); },
                    ),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: _FormField(
                    label: 'Status',
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: widget.editForm['status'],
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                      items: const [
                        DropdownMenuItem(value: 'draft', child: Text('Draft', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'published', child: Text('Published', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'archived', child: Text('Archived', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (v) { if (v != null) widget.onFormChange('status', v); },
                    ),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: _FormField(
                    label: 'Visibility',
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: widget.editForm['visibility'],
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                      items: const [
                        DropdownMenuItem(value: 'class', child: Text('🔒 Class', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'public', child: Text('🌐 Public', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (v) { if (v != null) widget.onFormChange('visibility', v); },
                    ),
                  )),
                ]),
                const SizedBox(height: 12),

                // Content editor
                _FormField(
                  label: 'Content',
                  child: TextField(
                    controller: _contentCtrl,
                    onChanged: (v) => widget.onFormChange('content', v),
                    maxLines: 20,
                    decoration: const InputDecoration(
                      hintText: 'Write lesson content here...\n\nUse # for headings\n## for sections\n- for bullet points\n**bold** for emphasis',
                      alignLabelWithHint: true,
                      contentPadding: EdgeInsets.all(12),
                    ),
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.6),
                  ),
                ),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── View Mode ─────────────────────────────────────────────────────
class _ViewMode extends StatelessWidget {
  const _ViewMode({
    required this.lesson, required this.tab, required this.currentUser,
    required this.canEdit, required this.onEdit,
  });
  final Lesson lesson;
  final TabController tab;
  final dynamic currentUser;
  final bool canEdit;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final type = lesson.lessonType.name;
    final color = _tColor(type);
    final wordCount = (lesson.content ?? '').split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
    final readTime = (wordCount / 200).ceil().clamp(1, 999);
    final slides = (lesson.content ?? '').split('\n').where((l) => l.startsWith('## ')).map((l) => l.substring(3)).toList();

    return Column(
      children: [
        // ── View Header ──
        Container(
          margin: const EdgeInsets.all(14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type icon
                  Container(
                    width: 50, height: 50,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: color.withValues(alpha: 0.2)),
                    ),
                    child: Center(child: Text(_tEmoji(type), style: const TextStyle(fontSize: 24))),
                  ),
                  const SizedBox(width: 14),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Chips
                        Wrap(spacing: 5, runSpacing: 4, children: [
                          _Chip(label: '${_tEmoji(type)} ${lesson.lessonType.label}', color: color),
                          _StatusChip(status: lesson.status),
                          _Chip(
                            label: lesson.isPublic ? '🌐 Public' : '🔒 Class',
                            color: lesson.isPublic ? AppColors.accent : Colors.grey,
                          ),
                          if (slides.isNotEmpty)
                            _Chip(label: '📊 ${slides.length} slides', color: const Color(0xFF8B5CF6)),
                        ]),
                        const SizedBox(height: 8),

                        // Title
                        Text(lesson.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, height: 1.2)),

                        // Description
                        if (lesson.description != null && lesson.description!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(lesson.description!, style: const TextStyle(color: Colors.grey, fontSize: 13, height: 1.5)),
                        ],

                        const SizedBox(height: 8),

                        // Meta
                        Wrap(spacing: 12, runSpacing: 4, children: [
                          Row(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.schedule_outlined, size: 12, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text('$readTime min read', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ]),
                          Row(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.article_outlined, size: 12, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text('$wordCount words', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ]),
                          if (lesson.teacherName != null)
                            Row(mainAxisSize: MainAxisSize.min, children: [
                              const Icon(Icons.person_outline, size: 12, color: Colors.grey),
                              const SizedBox(width: 3),
                              Text(lesson.teacherName!, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ]),
                          if (lesson.updatedAt != null)
                            Text('Updated ${timeago.format(lesson.updatedAt!)}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ]),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Action buttons
              Row(children: [
                if (canEdit) ...[
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Text('🔴', style: TextStyle(fontSize: 12)),
                    label: const Text('Go Live', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: BorderSide(color: AppColors.danger.withValues(alpha: 0.5)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                OutlinedButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: 'https://www.learn-ex.online/lessons/${lesson.id}'));
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link copied!')));
                  },
                  icon: const Icon(Icons.share_outlined, size: 14),
                  label: const Text('Share', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                if (canEdit) ...[
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: onEdit,
                    icon: const Icon(Icons.edit_outlined, size: 14),
                    label: const Text('Edit', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ]),
            ],
          ),
        ),

        // ── Tabs ──
        TabBar(
          controller: tab,
          labelColor: color,
          indicatorColor: color,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: '📖 Content'),
            Tab(text: '💬 Discussion'),
            Tab(text: '🔗 Resources'),
          ],
        ),

        // ── Tab content ──
        Expanded(
          child: TabBarView(
            controller: tab,
            children: [
              _ContentTab(lesson: lesson, slides: slides, canEdit: canEdit),
              _DiscussionTab(lesson: lesson, currentUser: currentUser),
              _ResourcesTab(lesson: lesson),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Content Tab ───────────────────────────────────────────────────
class _ContentTab extends StatelessWidget {
  const _ContentTab({required this.lesson, required this.slides, required this.canEdit});
  final Lesson lesson;
  final List<String> slides;
  final bool canEdit;

  @override
  Widget build(BuildContext context) {
    final content = lesson.content ?? '';
    final color = _tColor(lesson.lessonType.name);

    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        // Slide sections overview
        if (slides.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('📊 Slide Sections', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    if (canEdit)
                      OutlinedButton(
                        onPressed: () {},
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.danger,
                          side: BorderSide(color: AppColors.danger.withValues(alpha: 0.3)),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('🔴 Present', style: TextStyle(fontSize: 11)),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: slides.asMap().entries.map((e) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Text(
                      'Slide ${e.key + 1}: ${e.value}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  )).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Main content
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: content.isNotEmpty
              ? _ContentRenderer(content: content, color: color)
              : Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(children: [
                      Icon(Icons.article_outlined, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      const Text('No content yet', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
        ),
        const SizedBox(height: 12),

        // Share card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(14),
            border: Border(left: BorderSide(color: color, width: 3), top: BorderSide(color: Theme.of(context).dividerColor), right: BorderSide(color: Theme.of(context).dividerColor), bottom: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('📣 Share this lesson', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 4),
              const Text('Share a preview to the class feed so others can discover and join.', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 10),
              Row(children: [
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.share_outlined, size: 14),
                  label: const Text('Share to Feed', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: 'https://www.learn-ex.online/lessons/${lesson.id}'));
                    ScaffoldMessenger.of(context as BuildContext).showSnackBar(const SnackBar(content: Text('Link copied!')));
                  },
                  icon: const Icon(Icons.link_outlined, size: 14),
                  label: const Text('Copy Link', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                ),
              ]),
            ],
          ),
        ),
        const SizedBox(height: 60),
      ],
    );
  }
}

// ── Content Renderer (matches web renderMarkdown) ─────────────────
class _ContentRenderer extends StatelessWidget {
  const _ContentRenderer({required this.content, required this.color});
  final String content;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // If content looks like HTML, use flutter_html
    if (content.trim().startsWith('<') && content.contains('>')) {
      return Html(
        data: content,
        style: {
          'body': Style(fontSize: FontSize(15), lineHeight: const LineHeight(1.7), color: Theme.of(context).textTheme.bodyLarge?.color, margin: Margins.zero, padding: HtmlPaddings.zero),
          'h1': Style(fontSize: FontSize(24), fontWeight: FontWeight.w900, color: Theme.of(context).textTheme.headlineMedium?.color),
          'h2': Style(fontSize: FontSize(19), fontWeight: FontWeight.w800, color: color),
          'h3': Style(fontSize: FontSize(16), fontWeight: FontWeight.w700),
          'blockquote': Style(border: Border(left: BorderSide(color: color, width: 3)), padding: HtmlPaddings.only(left: 12), color: Colors.grey),
          'code': Style(
            backgroundColor: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
            padding: HtmlPaddings.symmetric(horizontal: 6, vertical: 2),
            fontFamily: 'monospace', fontSize: FontSize(13),
          ),
          'a': Style(color: color),
          'li': Style(fontSize: FontSize(14), lineHeight: const LineHeight(1.8)),
        },
        onLinkTap: (url, _, __) { if (url != null) launchUrl(Uri.parse(url)); },
      );
    }

    // Markdown-style content rendering matching web renderMarkdown exactly
    final lines = content.split('\n');
    final widgets = <Widget>[];

    for (final line in lines) {
      if (line.startsWith('# ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 24, bottom: 12),
          child: Text(line.substring(2), style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Theme.of(context).textTheme.headlineMedium?.color, height: 1.3)),
        ));
      } else if (line.startsWith('## ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 20, bottom: 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(line.substring(3), style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: color, height: 1.2)),
            const SizedBox(height: 4),
            Divider(color: color.withValues(alpha: 0.2), height: 1),
          ]),
        ));
      } else if (line.startsWith('### ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 6),
          child: Text(line.substring(4), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, height: 1.3)),
        ));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        widgets.add(Padding(
          padding: const EdgeInsets.only(left: 16, bottom: 4),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 6, height: 6, margin: const EdgeInsets.only(top: 8, right: 10), decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            Expanded(child: _InlineText(line.substring(2), style: const TextStyle(fontSize: 14, height: 1.7))),
          ]),
        ));
      } else if (line.startsWith('> ')) {
        widgets.add(Container(
          margin: const EdgeInsets.symmetric(vertical: 8),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.06),
            borderRadius: const BorderRadius.only(topRight: Radius.circular(8), bottomRight: Radius.circular(8)),
            border: Border(left: BorderSide(color: color, width: 4)),
          ),
          child: Text(line.substring(2), style: TextStyle(fontSize: 14, color: Colors.grey.shade600, fontStyle: FontStyle.italic, height: 1.6)),
        ));
      } else if (line.startsWith('---')) {
        widgets.add(const Divider(height: 32, thickness: 2));
      } else if (line.isEmpty) {
        widgets.add(const SizedBox(height: 6));
      } else if (line.contains('**')) {
        // Has bold
        widgets.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: _InlineText(line, style: const TextStyle(fontSize: 14, height: 1.7)),
        ));
      } else {
        widgets.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Text(line, style: const TextStyle(fontSize: 14, height: 1.7)),
        ));
      }
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: widgets);
  }
}

// Inline text with bold support
class _InlineText extends StatelessWidget {
  const _InlineText(this.text, {required this.style});
  final String text;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    final parts = text.split(RegExp(r'(\*\*.*?\*\*)'));
    if (parts.length == 1) return Text(text, style: style);

    return RichText(
      text: TextSpan(
        style: style.copyWith(color: Theme.of(context).textTheme.bodyLarge?.color),
        children: parts.map((p) {
          if (p.startsWith('**') && p.endsWith('**')) {
            return TextSpan(text: p.substring(2, p.length - 2), style: const TextStyle(fontWeight: FontWeight.w800));
          }
          return TextSpan(text: p);
        }).toList(),
      ),
    );
  }
}

// ── Discussion Tab ────────────────────────────────────────────────
class _DiscussionTab extends ConsumerStatefulWidget {
  const _DiscussionTab({required this.lesson, required this.currentUser});
  final Lesson lesson;
  final dynamic currentUser;

  @override
  ConsumerState<_DiscussionTab> createState() => _DiscussionTabState();
}

class _DiscussionTabState extends ConsumerState<_DiscussionTab> {
  final _commentCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(lessonDiscussionProvider(widget.lesson.id));
    final color = _tColor(widget.lesson.lessonType.name);

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
                  gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.7)]),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.chat_outlined, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 10),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Lesson Discussion', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                Text(widget.lesson.isPublic ? '🌐 Public · Anyone can discuss' : '🔒 Class members only',
                    style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ]),
              const Spacer(),
              async.when(
                data: (c) => c.isNotEmpty ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                  child: Text('${c.length}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
                ) : const SizedBox.shrink(),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: async.when(
            loading: () => const LoadingView(),
            error: (_, __) => const Center(child: Text('Could not load discussion')),
            data: (comments) {
              if (comments.isEmpty) {
                return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.chat_bubble_outline, size: 40, color: Colors.grey.shade400),
                  const SizedBox(height: 10),
                  const Text('No messages yet', style: TextStyle(fontWeight: FontWeight.w700)),
                  const Text('Start the discussion! 💬', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ]));
              }
              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                itemCount: comments.length,
                itemBuilder: (_, i) {
                  final c = comments[i];
                  final author = c['author'] as Map<String, dynamic>?;
                  final authorId = author?['id'] as int? ?? c['user_id'] as int?;
                  final isMe = authorId == widget.currentUser?.id;
                  final name = author?['full_name'] as String? ?? 'User';
                  final role = author?['role'] as String? ?? 'learner';
                  final content = c['content'] as String? ?? '';
                  final createdAt = c['created_at'] as String?;
                  final roleColors = {'teacher': AppColors.brand, 'admin': AppColors.danger};
                  final nameColor = roleColors[role] ?? const Color(0xFF38BDF8);

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (!isMe) ...[
                          UserAvatar(name: name, radius: 14),
                          const SizedBox(width: 6),
                        ],
                        Column(
                          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                          children: [
                            if (!isMe)
                              Padding(
                                padding: const EdgeInsets.only(left: 4, bottom: 2),
                                child: Text(name, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: nameColor)),
                              ),
                            Container(
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
                              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
                              decoration: BoxDecoration(
                                gradient: isMe ? LinearGradient(colors: [color, color.withValues(alpha: 0.8)]) : null,
                                color: isMe ? null : Theme.of(context).cardColor,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isMe ? 16 : 3),
                                  bottomRight: Radius.circular(isMe ? 3 : 16),
                                ),
                                border: isMe ? null : Border.all(color: Theme.of(context).dividerColor),
                              ),
                              child: Text(content, style: TextStyle(fontSize: 14, color: isMe ? Colors.white : null, height: 1.4)),
                            ),
                            if (createdAt != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
                                child: Text(timeago.format(DateTime.parse(createdAt)), style: const TextStyle(fontSize: 9, color: Colors.grey)),
                              ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
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
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: TextField(
                    controller: _commentCtrl,
                    decoration: const InputDecoration.collapsed(hintText: 'Add a comment...'),
                    style: const TextStyle(fontSize: 14),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendComment(),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _sending ? null : _sendComment,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: 38, height: 38,
                  decoration: BoxDecoration(
                    gradient: _commentCtrl.text.trim().isNotEmpty
                        ? LinearGradient(colors: [color, color.withValues(alpha: 0.8)])
                        : null,
                    color: _commentCtrl.text.trim().isEmpty ? Theme.of(context).dividerColor : null,
                    shape: BoxShape.circle,
                  ),
                  child: _sending
                      ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Icon(Icons.send_rounded, size: 16, color: _commentCtrl.text.trim().isNotEmpty ? Colors.white : Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _sendComment() async {
    final text = _commentCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() { _sending = true; _commentCtrl.clear(); });
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/lessons/${widget.lesson.id}/discussion', data: {'content': text});
      ref.refresh(lessonDiscussionProvider(widget.lesson.id));
    } catch (_) {}
    finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}

// ── Resources Tab ─────────────────────────────────────────────────
class _ResourcesTab extends StatelessWidget {
  const _ResourcesTab({required this.lesson});
  final Lesson lesson;

  @override
  Widget build(BuildContext context) {
    final color = _tColor(lesson.lessonType.name);
    final resources = lesson.resources;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(children: [
          Icon(Icons.link_outlined, size: 18, color: color),
          const SizedBox(width: 8),
          const Text('Lesson Resources', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        ]),
        const SizedBox(height: 14),

        if (resources.isEmpty)
          Center(child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(children: [
              Icon(Icons.link_off_outlined, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              const Text('No resources yet', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
            ]),
          ))
        else
          ...resources.map((r) {
            final res = r as Map<String, dynamic>;
            final title = res['title'] as String? ?? 'Resource';
            final url = res['url'] as String? ?? '';
            final type = res['resource_type'] as String? ?? 'link';
            final typeIcons = {'file': Icons.attach_file, 'image': Icons.image_outlined, 'video': Icons.play_circle_outline, 'link': Icons.link_outlined};
            final rIcon = typeIcons[type] ?? Icons.link_outlined;

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Theme.of(context).dividerColor),
              ),
              child: ListTile(
                leading: Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: Icon(rIcon, color: color, size: 18),
                ),
                title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text(url, style: const TextStyle(fontSize: 11, color: Colors.grey), overflow: TextOverflow.ellipsis),
                trailing: const Icon(Icons.open_in_new, size: 16, color: Colors.grey),
                onTap: () { if (url.isNotEmpty) launchUrl(Uri.parse(url)); },
              ),
            );
          }),
        const SizedBox(height: 60),
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = status == 'published' ? AppColors.accent : status == 'archived' ? Colors.grey : AppColors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _FormField extends StatelessWidget {
  const _FormField({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.3)),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}