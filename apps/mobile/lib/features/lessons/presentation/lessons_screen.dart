import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/lesson.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/lessons_provider.dart';
import 'ai_generate_lesson_sheet.dart';

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

Color _typeColor(String type) => _typeColors[type] ?? AppColors.brand;
IconData _typeIcon(String type) => _typeIcons[type] ?? Icons.menu_book_outlined;

// ── Screen ────────────────────────────────────────────────────────
class LessonsScreen extends ConsumerStatefulWidget {
  const LessonsScreen({super.key});
  @override
  ConsumerState<LessonsScreen> createState() => _LessonsScreenState();
}

class _LessonsScreenState extends ConsumerState<LessonsScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';
  String _filterType = 'all';
  String _filterStatus = 'all';
  bool _showFilters = false;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final isTeacher = user?.isTeacher ?? false;
    final isAdmin = user?.isAdmin ?? false;
    final async = ref.watch(lessonsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lessons'),
        actions: [
          IconButton(
            icon: Icon(_showFilters ? Icons.filter_list : Icons.filter_list_outlined),
            color: _showFilters ? AppColors.brand : null,
            onPressed: () => setState(() => _showFilters = !_showFilters),
          ),
          if (isTeacher || isAdmin)
            IconButton(
              icon: const Icon(Icons.auto_awesome_outlined),
              color: AppColors.brand,
              tooltip: 'AI Generate',
              onPressed: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                useSafeArea: true,
                builder: (_) => const AiGenerateLessonSheet(),
              ),
            ),
          if (isTeacher || isAdmin)
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              color: AppColors.brand,
              onPressed: () => _showCreateSheet(context),
            ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search lessons...',
                prefixIcon: const Icon(Icons.search, size: 18),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.close, size: 16), onPressed: () { _searchCtrl.clear(); setState(() => _query = ''); })
                    : null,
                filled: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),

          // Filter chips
          if (_showFilters) ...[
            // Type filter
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  for (final f in ['all', 'note', 'video', 'live', 'assignment'])
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _FilterChip(
                        label: f == 'all' ? 'All Types' : f.toUpperCase(),
                        selected: _filterType == f,
                        color: f == 'all' ? Colors.grey : _typeColor(f),
                        onTap: () => setState(() => _filterType = f),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            // Status filter
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  for (final s in ['all', 'published', 'draft'])
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _FilterChip(
                        label: s == 'all' ? 'All Status' : s.toUpperCase(),
                        selected: _filterStatus == s,
                        color: s == 'published' ? AppColors.accent : s == 'draft' ? Colors.grey : Colors.grey,
                        onTap: () => setState(() => _filterStatus = s),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 4),
          ],

          // Stats bar
          async.when(
            data: (lessons) {
              final published = lessons.where((l) => l.isPublished).length;
              final draft = lessons.where((l) => l.status == 'draft').length;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(
                  children: [
                    Text('${lessons.length} lessons', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    const SizedBox(width: 8),
                    _StatDot(label: '$published published', color: AppColors.accent),
                    const SizedBox(width: 8),
                    _StatDot(label: '$draft draft', color: Colors.grey),
                  ],
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),

          // Lessons list
          Expanded(
            child: async.when(
              loading: () => const LoadingView(),
              error: (e, _) => ErrorView(
                message: 'Could not load lessons',
                onRetry: () => ref.refresh(lessonsListProvider),
              ),
              data: (lessons) {
                // Apply filters
                final filtered = lessons.where((l) {
                  final matchQ = _query.isEmpty ||
                      l.title.toLowerCase().contains(_query) ||
                      (l.description ?? '').toLowerCase().contains(_query);
                  final matchT = _filterType == 'all' || l.lessonType.name == _filterType;
                  final matchS = _filterStatus == 'all' || l.status == _filterStatus;
                  return matchQ && matchT && matchS;
                }).toList();

                if (filtered.isEmpty) {
                  return EmptyView(
                    title: _query.isNotEmpty ? 'No lessons found' : 'No lessons yet',
                    subtitle: isTeacher ? 'Create or AI-generate a lesson!' : 'Lessons will appear here',
                    icon: Icons.menu_book_outlined,
                  );
                }

                return RefreshIndicator(
                  color: AppColors.brand,
                  onRefresh: () => ref.refresh(lessonsListProvider.future),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) => _LessonCard(
                      lesson: filtered[i],
                      currentUser: user,
                      onRefresh: () => ref.refresh(lessonsListProvider),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CreateLessonSheet(onCreated: () => ref.refresh(lessonsListProvider)),
    );
  }
}

// ── Lesson Card ───────────────────────────────────────────────────
class _LessonCard extends ConsumerWidget {
  const _LessonCard({required this.lesson, required this.currentUser, required this.onRefresh});
  final Lesson lesson;
  final dynamic currentUser;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = lesson.lessonType.name;
    final color = _typeColor(type);
    final icon = _typeIcon(type);
    final isOwner = currentUser?.id == lesson.teacherId || (currentUser?.isAdmin ?? false);

    return GestureDetector(
      onTap: () => context.push('/lessons/${lesson.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          children: [
            // Color bar
            Container(height: 3, color: color),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  // Type icon
                  Container(
                    width: 46, height: 46,
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  const SizedBox(width: 12),

                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Type + status badges
                        Row(children: [
                          _TypeBadge(label: lesson.lessonType.label, color: color),
                          const SizedBox(width: 5),
                          _StatusBadge(status: lesson.status),
                          if (!lesson.isPublic) ...[
                            const SizedBox(width: 5),
                            _TypeBadge(label: '🔒', color: Colors.grey),
                          ],
                        ]),
                        const SizedBox(height: 4),

                        // Title
                        Text(lesson.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),

                        // Description
                        if (lesson.description != null && lesson.description!.isNotEmpty)
                          Text(lesson.description!, style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),

                        const SizedBox(height: 6),

                        // Meta row
                        Row(children: [
                          if (lesson.teacherName != null) ...[
                            const Icon(Icons.person_outline, size: 12, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text(lesson.teacherName!, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            const SizedBox(width: 10),
                          ],
                          if (lesson.className != null) ...[
                            const Icon(Icons.class_outlined, size: 12, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text(lesson.className!, style: const TextStyle(fontSize: 11, color: Colors.grey), overflow: TextOverflow.ellipsis),
                            const SizedBox(width: 10),
                          ],
                          if (lesson.createdAt != null) ...[
                            const Icon(Icons.schedule_outlined, size: 12, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text(timeago.format(lesson.createdAt!), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ]),
                      ],
                    ),
                  ),

                  // Trailing
                  Column(
                    children: [
                      const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
                      if (isOwner)
                        GestureDetector(
                          onTap: () => _showOptions(context, ref),
                          child: const Padding(
                            padding: EdgeInsets.only(top: 8),
                            child: Icon(Icons.more_vert, size: 18, color: Colors.grey),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showOptions(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.edit_outlined),
            title: const Text('Edit Lesson'),
            onTap: () { Navigator.pop(context); context.push('/lessons/${lesson.id}'); },
          ),
          ListTile(
            leading: const Icon(Icons.delete_outline, color: AppColors.danger),
            title: const Text('Delete', style: TextStyle(color: AppColors.danger)),
            onTap: () async {
              Navigator.pop(context);
              final confirm = await showDialog<bool>(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Delete lesson'),
                  content: Text('Delete "${lesson.title}"?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                    TextButton(onPressed: () => Navigator.pop(context, true), style: TextButton.styleFrom(foregroundColor: AppColors.danger), child: const Text('Delete')),
                  ],
                ),
              );
              if (confirm == true) {
                try {
                  final dio = ref.read(dioProvider);
                  await dio.delete('/lessons/${lesson.id}');
                  onRefresh();
                } catch (e) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              }
            },
          ),
        ],
      ),
    );
  }
}

// ── Create Lesson Sheet ───────────────────────────────────────────
class _CreateLessonSheet extends ConsumerStatefulWidget {
  const _CreateLessonSheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateLessonSheet> createState() => _CreateLessonSheetState();
}

class _CreateLessonSheetState extends ConsumerState<_CreateLessonSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _type = 'note';
  String _visibility = 'class';
  bool _loading = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/lessons', data: {
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'lesson_type': _type,
        'visibility': _visibility,
        'status': 'draft',
        'content': '',
      });
      if (mounted) {
        Navigator.pop(context);
        widget.onCreated();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.brand, Color(0xFF8B5CF6)]), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.add, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Text('Create New Lesson', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                ],
              ),
              const SizedBox(height: 20),

              TextFormField(
                controller: _titleCtrl,
                decoration: const InputDecoration(labelText: 'Lesson title', prefixIcon: Icon(Icons.menu_book_outlined)),
                validator: (v) => v == null || v.trim().isEmpty ? 'Title required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descCtrl,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Description (optional)', prefixIcon: Icon(Icons.description_outlined), alignLabelWithHint: true),
              ),
              const SizedBox(height: 14),

              // Type selector
              const Text('Lesson Type', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final t in ['note', 'video', 'live', 'assignment'])
                  GestureDetector(
                    onTap: () => setState(() => _type = t),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: _type == t ? _typeColor(t).withValues(alpha: 0.1) : null,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _type == t ? _typeColor(t) : Theme.of(context).dividerColor, width: _type == t ? 2 : 1),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_typeIcon(t), size: 14, color: _type == t ? _typeColor(t) : Colors.grey),
                          const SizedBox(width: 5),
                          Text(t.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _type == t ? _typeColor(t) : Colors.grey)),
                        ],
                      ),
                    ),
                  ),
              ]),
              const SizedBox(height: 14),

              // Visibility
              const Text('Visibility', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: _VisOpt(label: '🔒 Class Only', value: 'class', current: _visibility, onTap: () => setState(() => _visibility = 'class'))),
                const SizedBox(width: 8),
                Expanded(child: _VisOpt(label: '🌐 Public', value: 'public', current: _visibility, onTap: () => setState(() => _visibility = 'public'))),
              ]),
              const SizedBox(height: 20),

              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brand, foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Create Lesson', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _VisOpt extends StatelessWidget {
  const _VisOpt({required this.label, required this.value, required this.current, required this.onTap});
  final String label, value, current;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selected = current == value;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: selected ? AppColors.brand.withValues(alpha: 0.08) : null,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? AppColors.brand : Theme.of(context).dividerColor, width: selected ? 2 : 1),
        ),
        child: Text(label, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? AppColors.brand : Colors.grey)),
      ),
    );
  }
}

// ── Filter Chip ───────────────────────────────────────────────────
class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.color, required this.onTap});
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? color : Theme.of(context).dividerColor),
        ),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? Colors.white : Colors.grey)),
      ),
    );
  }
}

// ── Shared Badges ─────────────────────────────────────────────────
class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color, letterSpacing: 0.3)),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = status == 'published' ? AppColors.accent : status == 'archived' ? Colors.grey : const Color(0xFFF59E0B);
    final label = status == 'published' ? '✅ Published' : status == 'archived' ? '📦 Archived' : '📝 Draft';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _StatDot extends StatelessWidget {
  const _StatDot({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
      ],
    );
  }
}