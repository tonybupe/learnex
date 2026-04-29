import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/class_model.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../../shared/widgets/subject_selector.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/classes_provider.dart';

const _kColors = [
  AppColors.brand, Color(0xFF38BDF8), AppColors.accent,
  AppColors.warning, Color(0xFF8B5CF6), Color(0xFF06B6D4), AppColors.danger,
];
Color _classColor(int id) => _kColors[id % _kColors.length];

// ── Screen ────────────────────────────────────────────────────────
class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key});
  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';
  String _filter = 'all'; // all | mine | enrolled | other
  int _page = 1;
  static const _pageSize = 9;
  String _joinError = '';

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
    final isLearner = user?.isLearner ?? false;
    final classesAsync = ref.watch(classesListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const Icon(Icons.school_outlined, color: AppColors.brand, size: 22),
          const SizedBox(width: 8),
          const Text('Classes', style: TextStyle(fontWeight: FontWeight.w900)),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.explore_outlined),
            tooltip: 'Discover',
            onPressed: () => context.push('/discover'),
          ),
          if (isTeacher || isAdmin)
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.brand, Color(0xFF8B5CF6)]),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 16),
              ),
              onPressed: () => _showCreateSheet(context),
            ),
        ],
      ),
      body: classesAsync.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(
          message: 'Could not load classes',
          onRetry: () => ref.read(classesListProvider.notifier).load(),
        ),
        data: (classes) {
          // Calculate counts matching web
          final mineCount = classes.where((c) => c.isOwner == true || c.teacherId == user?.id).length;
          final enrolledCount = classes.where((c) => (c.isMember ?? false) && c.teacherId != user?.id).length;
          final otherCount = classes.where((c) => !(c.isMember ?? false) && c.teacherId != user?.id).length;

          // Filter
          List<ClassModel> filtered = classes;
          if (_filter == 'mine') filtered = classes.where((c) => c.teacherId == user?.id).toList();
          else if (_filter == 'enrolled') filtered = classes.where((c) => (c.isMember ?? false) && c.teacherId != user?.id).toList();
          else if (_filter == 'other') filtered = classes.where((c) => !(c.isMember ?? false) && c.teacherId != user?.id).toList();

          // Search
          if (_query.isNotEmpty) {
            filtered = filtered.where((c) =>
              c.title.toLowerCase().contains(_query) ||
              (c.classCode ?? '').toLowerCase().contains(_query) ||
              (c.subjectName ?? '').toLowerCase().contains(_query) ||
              (c.teacherName ?? '').toLowerCase().contains(_query) ||
              (c.description ?? '').toLowerCase().contains(_query)
            ).toList();
          }

          // Pagination
          final totalPages = (filtered.length / _pageSize).ceil().clamp(1, 999);
          final start = (_page - 1) * _pageSize;
          final paginated = filtered.skip(start).take(_pageSize).toList();

          // Tabs matching web
          final tabs = (isTeacher || isAdmin) ? [
            ('all', 'All', classes.length),
            ('mine', 'My Classes', mineCount),
            ('enrolled', 'Joined', enrolledCount),
            ('other', 'Discover', otherCount),
          ] : [
            ('all', 'All', classes.length),
            ('enrolled', 'Enrolled', enrolledCount),
            ('other', 'Discover', otherCount),
          ];

          return RefreshIndicator(
            color: AppColors.brand,
            onRefresh: () => ref.read(classesListProvider.notifier).load(),
            child: CustomScrollView(
              slivers: [
                // ── Stats subtitle ──
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Text(
                      (isTeacher || isAdmin)
                          ? '${classes.length} classes · $mineCount yours · $enrolledCount joined'
                          : '${classes.length} classes · $enrolledCount enrolled',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ),
                ),

                // ── Join error ──
                if (_joinError.isNotEmpty)
                  SliverToBoxAdapter(
                    child: Container(
                      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
                      ),
                      child: Row(children: [
                        const Icon(Icons.error_outline, color: AppColors.danger, size: 14),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_joinError, style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600))),
                        IconButton(icon: const Icon(Icons.close, size: 14), color: AppColors.danger, onPressed: () => setState(() => _joinError = ''), padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                      ]),
                    ),
                  ),

                // ── Filter tabs ──
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(0, 10, 0, 0),
                    child: SizedBox(
                      height: 40,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: tabs.map((t) {
                          final selected = _filter == t.$1;
                          return GestureDetector(
                            onTap: () => setState(() { _filter = t.$1; _page = 1; }),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: selected ? AppColors.brand : Theme.of(context).cardColor,
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: selected ? AppColors.brand : Theme.of(context).dividerColor, width: selected ? 1.5 : 1),
                              ),
                              child: Row(mainAxisSize: MainAxisSize.min, children: [
                                Text(t.$2, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? Colors.white : Colors.grey)),
                                const SizedBox(width: 5),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: selected ? Colors.white.withValues(alpha: 0.25) : Theme.of(context).dividerColor,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text('${t.$3}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: selected ? Colors.white : Colors.grey)),
                                ),
                              ]),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ),

                // ── Search ──
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: TextField(
                      controller: _searchCtrl,
                      onChanged: (v) => setState(() { _query = v.toLowerCase(); _page = 1; }),
                      decoration: InputDecoration(
                        hintText: 'Search classes...',
                        prefixIcon: const Icon(Icons.search, size: 18),
                        suffixIcon: _query.isNotEmpty
                            ? IconButton(icon: const Icon(Icons.close, size: 16), onPressed: () { _searchCtrl.clear(); setState(() { _query = ''; _page = 1; }); })
                            : null,
                        filled: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 0),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                ),

                // ── Empty ──
                if (paginated.isEmpty)
                  SliverFillRemaining(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Text('🎓', style: TextStyle(fontSize: 52)),
                          const SizedBox(height: 12),
                          Text(
                            _query.isNotEmpty ? 'No classes match "$_query"'
                                : _filter == 'mine' ? 'No classes yet'
                                : _filter == 'enrolled' ? 'Not enrolled in any classes'
                                : 'No classes found',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            isTeacher && _filter == 'mine' ? 'Create your first class to start teaching.'
                                : isLearner ? 'Discover and join classes from your teachers.'
                                : 'Try a different filter.',
                            style: const TextStyle(color: Colors.grey, fontSize: 13),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 20),
                          if (isTeacher && _filter != 'enrolled')
                            ElevatedButton.icon(
                              onPressed: () => _showCreateSheet(context),
                              icon: const Icon(Icons.add, size: 14),
                              label: const Text('Create Class'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.brand, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                            ),
                          if (isLearner)
                            ElevatedButton.icon(
                              onPressed: () => context.push('/discover'),
                              icon: const Icon(Icons.explore_outlined, size: 14),
                              label: const Text('Discover Classes'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.brand, foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                            ),
                        ]),
                      ),
                    ),
                  ),

                // ── Grid of class cards ──
                if (paginated.isNotEmpty)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _ClassCard(
                            cls: paginated[i],
                            currentUser: user,
                            isTeacher: isTeacher,
                            isAdmin: isAdmin,
                            isLearner: isLearner,
                            onOpen: () => context.push('/classes/${paginated[i].id}'),
                            onJoin: () => _join(paginated[i]),
                            onLeave: () => _leave(paginated[i]),
                            onDelete: () => _delete(paginated[i]),
                            onEdit: () => _showCreateSheet(context, cls: paginated[i]),
                          ),
                        ),
                        childCount: paginated.length,
                      ),
                    ),
                  ),

                // ── Pagination ──
                if (totalPages > 1)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.chevron_left),
                            onPressed: _page > 1 ? () => setState(() => _page--) : null,
                          ),
                          ...List.generate(totalPages.clamp(0, 7), (i) {
                            final p = i + 1;
                            return GestureDetector(
                              onTap: () => setState(() => _page = p),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                width: 34, height: 34,
                                decoration: BoxDecoration(
                                  color: p == _page ? AppColors.brand : Theme.of(context).cardColor,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: p == _page ? AppColors.brand : Theme.of(context).dividerColor),
                                ),
                                child: Center(child: Text('$p', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: p == _page ? Colors.white : null))),
                              ),
                            );
                          }),
                          IconButton(
                            icon: const Icon(Icons.chevron_right),
                            onPressed: _page < totalPages ? () => setState(() => _page++) : null,
                          ),
                        ],
                      ),
                    ),
                  ),

                // ── Pagination info ──
                if (filtered.isNotEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: Text(
                        'Showing ${((_page - 1) * _pageSize + 1).clamp(1, filtered.length)}–${(_page * _pageSize).clamp(1, filtered.length)} of ${filtered.length} classes',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _join(ClassModel cls) async {
    if (cls.visibility == 'private') {
      final code = await _askCode();
      if (code == null) return;
      try {
        await ref.read(classesListProvider.notifier).joinClass(cls.id, code: code);
      } catch (e) {
        if (mounted) setState(() => _joinError = 'Failed to join: $e');
      }
    } else {
      try {
        await ref.read(classesListProvider.notifier).joinClass(cls.id);
      } catch (e) {
        if (mounted) setState(() => _joinError = e.toString());
      }
    }
  }

  Future<void> _leave(ClassModel cls) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Leave class'),
        content: Text('Leave "${cls.title}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), style: TextButton.styleFrom(foregroundColor: AppColors.danger), child: const Text('Leave')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(classesListProvider.notifier).leaveClass(cls.id);
    } catch (e) {
      if (mounted) setState(() => _joinError = e.toString());
    }
  }

  Future<void> _delete(ClassModel cls) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete class'),
        content: Text('Delete "${cls.title}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), style: TextButton.styleFrom(foregroundColor: AppColors.danger), child: const Text('Delete')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      final dio = ref.read(dioProvider);
      await dio.delete('/classes/${cls.id}');
      ref.read(classesListProvider.notifier).load();
    } catch (e) {
      if (mounted) setState(() => _joinError = 'Delete failed: $e');
    }
  }

  Future<String?> _askCode() => showDialog<String>(
    context: context,
    builder: (_) {
      final ctrl = TextEditingController();
      return AlertDialog(
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
      );
    },
  );

  void _showCreateSheet(BuildContext context, {ClassModel? cls}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CreateClassSheet(
        cls: cls,
        onCreated: () => ref.read(classesListProvider.notifier).load(),
      ),
    );
  }
}

// ── Class Card matching web exactly ──────────────────────────────
class _ClassCard extends StatelessWidget {
  const _ClassCard({
    required this.cls, required this.currentUser,
    required this.isTeacher, required this.isAdmin, required this.isLearner,
    required this.onOpen, required this.onJoin, required this.onLeave,
    required this.onDelete, required this.onEdit,
  });

  final ClassModel cls;
  final dynamic currentUser;
  final bool isTeacher, isAdmin, isLearner;
  final VoidCallback onOpen, onJoin, onLeave, onDelete, onEdit;

  @override
  Widget build(BuildContext context) {
    final color = _classColor(cls.id);
    final isOwner = cls.teacherId == currentUser?.id || (currentUser?.isAdmin ?? false);
    final isMember = cls.isMember ?? false;
    final canEdit = isOwner;
    final canDelete = isOwner;
    final canJoin = !isOwner && !isMember;
    final canLeave = !isOwner && isMember;

    return GestureDetector(
      onTap: onOpen,
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Color bar gradient matching web
            Container(
              height: 4,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.4)]),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Badges row matching web ──
                  Wrap(spacing: 5, runSpacing: 4, children: [
                    if (cls.classCode != null)
                      _Badge(label: cls.classCode!, color: Colors.grey),
                    if (cls.gradeLevel != null)
                      _Badge(label: cls.gradeLevel!, color: Colors.grey),
                    _Badge(
                      label: cls.isPublic ? '🌐 public' : '🔒 private',
                      color: cls.isPublic ? AppColors.accent : Colors.grey,
                      bg: cls.isPublic ? AppColors.accent.withValues(alpha: 0.08) : Colors.grey.withValues(alpha: 0.08),
                    ),
                    if (isOwner) _Badge(label: '✏️ Mine', color: color, bg: color.withValues(alpha: 0.12)),
                    if (isMember && !isOwner) _Badge(label: '✅ Enrolled', color: AppColors.accent, bg: AppColors.accent.withValues(alpha: 0.1)),
                  ]),
                  const SizedBox(height: 8),

                  // ── Title ──
                  Text(cls.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, height: 1.3)),

                  // ── Subject + Teacher ──
                  if (cls.subjectName != null)
                    Text('📚 ${cls.subjectName}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  if (cls.teacherName != null)
                    Text('👤 ${cls.teacherName}', style: const TextStyle(fontSize: 11, color: Colors.grey)),

                  // ── Description ──
                  if (cls.description != null && cls.description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(cls.description!, style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.5), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],

                  // ── Student count ──
                  const SizedBox(height: 6),
                  Row(children: [
                    const Icon(Icons.people_outline, size: 13, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('${cls.memberCount} student${cls.memberCount != 1 ? 's' : ''}', style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    const Icon(Icons.menu_book_outlined, size: 13, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('${cls.lessonCount} lessons', style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
                  ]),
                ],
              ),
            ),

            // ── Actions row matching web ──
            Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).dividerColor))),
              child: Row(children: [
                // Open button
                Expanded(
                  child: GestureDetector(
                    onTap: onOpen,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.8)]),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(child: Text('Open →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12))),
                    ),
                  ),
                ),

                if (canJoin) ...[
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: onJoin,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: color.withValues(alpha: 0.3)),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.person_add_outlined, size: 12, color: color),
                        const SizedBox(width: 4),
                        Text('Join', style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
                      ]),
                    ),
                  ),
                ],

                if (canLeave) ...[
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: onLeave,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Theme.of(context).dividerColor),
                      ),
                      child: const Text('Leave', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                  ),
                ],

                if (canEdit) ...[
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: onEdit,
                    child: Container(
                      width: 34, height: 34,
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Theme.of(context).dividerColor),
                      ),
                      child: const Icon(Icons.edit_outlined, size: 14, color: Colors.grey),
                    ),
                  ),
                ],

                if (canDelete) ...[
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: onDelete,
                    child: Container(
                      width: 34, height: 34,
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
                      ),
                      child: const Icon(Icons.delete_outline, size: 14, color: AppColors.danger),
                    ),
                  ),
                ],
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color, this.bg});
  final String label;
  final Color color;
  final Color? bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: bg ?? color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

// ── Create/Edit Class Sheet matching web modal ────────────────────
class _CreateClassSheet extends ConsumerStatefulWidget {
  const _CreateClassSheet({this.cls, required this.onCreated});
  final ClassModel? cls;
  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateClassSheet> createState() => _CreateClassSheetState();
}

class _CreateClassSheetState extends ConsumerState<_CreateClassSheet> {
  final _titleCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _gradeCtrl = TextEditingController();
  String _visibility = 'public';
  String _selectedSubjectId = '';
  bool _loading = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    if (widget.cls != null) {
      _titleCtrl.text = widget.cls!.title;
      _codeCtrl.text = widget.cls!.classCode ?? '';
      _descCtrl.text = widget.cls!.description ?? '';
      _gradeCtrl.text = widget.cls!.gradeLevel ?? '';
      _visibility = widget.cls!.visibility;
      _selectedSubjectId = widget.cls!.subjectId?.toString() ?? '';
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _codeCtrl.dispose();
    _descCtrl.dispose();
    _gradeCtrl.dispose();
    super.dispose();
  }



  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty) { setState(() => _error = 'Class title is required'); return; }
    if (_codeCtrl.text.trim().isEmpty) { setState(() => _error = 'Class code is required'); return; }
    if (_selectedSubjectId.isEmpty) { setState(() => _error = 'Please select a subject'); return; }

    setState(() { _loading = true; _error = ''; });
    try {
      final dio = ref.read(dioProvider);
      final data = {
        'title': _titleCtrl.text.trim(),
        'class_code': _codeCtrl.text.trim().toUpperCase(),
        if (_descCtrl.text.trim().isNotEmpty) 'description': _descCtrl.text.trim(),
        'subject_id': int.parse(_selectedSubjectId),
        if (_gradeCtrl.text.trim().isNotEmpty) 'grade_level': _gradeCtrl.text.trim(),
        'visibility': _visibility,
      };

      if (widget.cls != null) {
        await dio.patch('/classes/${widget.cls!.id}', data: data);
      } else {
        await dio.post('/classes', data: data);
      }

      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      final msg = e.toString();
      if (mounted) setState(() { _error = msg.contains('detail') ? msg : 'Failed to ${widget.cls != null ? 'update' : 'create'} class'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.cls != null;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(22),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 14),

              // Header matching web
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(isEdit ? 'Edit Class' : 'Create New Class', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context), padding: EdgeInsets.zero),
                ],
              ),
              const SizedBox(height: 18),

              // Error
              if (_error.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.danger.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.danger.withValues(alpha: 0.2))),
                  child: Text(_error, style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(height: 12),
              ],

              // Title + Code row (matching web 2fr 1fr)
              Row(children: [
                Expanded(flex: 2, child: _Field(
                  label: 'Class Title *',
                  child: TextField(controller: _titleCtrl, decoration: const InputDecoration(hintText: 'e.g. Mathematics Grade 10')),
                )),
                const SizedBox(width: 10),
                Expanded(flex: 1, child: _Field(
                  label: 'Class Code *',
                  child: TextField(
                    controller: _codeCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(hintText: 'MATH101'),
                  ),
                )),
              ]),
              const SizedBox(height: 12),

              // Description
              _Field(
                label: 'Description',
                child: TextField(controller: _descCtrl, decoration: const InputDecoration(hintText: 'What will students learn?')),
              ),
              const SizedBox(height: 12),

              // Subject + Grade + Visibility (matching web 1fr 1fr 1fr)
              Row(children: [
                Expanded(child: _Field(
                  label: 'Subject *',
                  child: SubjectSelector(
                    value: _selectedSubjectId,
                    onChange: (v) => setState(() => _selectedSubjectId = v),
                    showMineOnly: true,
                  ),
                )),




                const SizedBox(width: 8),
                Expanded(child: _Field(
                  label: 'Grade Level',
                  child: TextField(controller: _gradeCtrl, decoration: const InputDecoration(hintText: 'e.g. Form 1', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10))),
                )),
                const SizedBox(width: 8),
                Expanded(child: _Field(
                  label: 'Visibility',
                  child: DropdownButtonFormField<String>(
                    value: _visibility,
                    decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                    items: const [
                      DropdownMenuItem(value: 'public', child: Text('🌐 Public', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'private', child: Text('🔒 Private', style: TextStyle(fontSize: 13))),
                    ],
                    onChanged: (v) { if (v != null) setState(() => _visibility = v); },
                  ),
                )),
              ]),
              const SizedBox(height: 20),

              // Buttons matching web
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _loading ? null : _submit,
                    icon: _loading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.add, size: 15),
                    label: Text(_loading ? 'Saving...' : isEdit ? 'Update Class' : 'Create Class', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brand, foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                  ),
                ),
              ]),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        const SizedBox(height: 5),
        child,
      ],
    );
  }
}