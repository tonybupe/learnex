import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/classes_provider.dart';
import '../../../models/class_model.dart';

// ── Colors ───────────────────────────────────────────────────────
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

class _ClassesScreenState extends ConsumerState<ClassesScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this);
  final _searchCtrl = TextEditingController();
  String _query = '';
  String _filterVisibility = 'all';
  bool _showCreate = false;

  @override
  void dispose() {
    _tab.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final isTeacher = user?.isTeacher ?? false;
    final isAdmin = user?.isAdmin ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Classes'),
        bottom: TabBar(
          controller: _tab,
          labelColor: AppColors.brand,
          indicatorColor: AppColors.brand,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: 'My Classes'),
            Tab(text: 'Discover'),
          ],
        ),
        actions: [
          if (isTeacher || isAdmin)
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              color: AppColors.brand,
              onPressed: () => _showCreateModal(context),
            ),
        ],
      ),
      body: Column(
        children: [
          // Search + filter
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: (v) => setState(() => _query = v.toLowerCase()),
                    decoration: InputDecoration(
                      hintText: 'Search classes...',
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
                const SizedBox(width: 8),
                // Filter chips
                _FilterChip(
                  label: 'All',
                  selected: _filterVisibility == 'all',
                  onTap: () => setState(() => _filterVisibility = 'all'),
                ),
                const SizedBox(width: 4),
                _FilterChip(
                  label: '🌐',
                  selected: _filterVisibility == 'public',
                  onTap: () => setState(() => _filterVisibility = 'public'),
                ),
                const SizedBox(width: 4),
                _FilterChip(
                  label: '🔒',
                  selected: _filterVisibility == 'private',
                  onTap: () => setState(() => _filterVisibility = 'private'),
                ),
              ],
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tab,
              children: [
                _MyClassesTab(query: _query, filterVisibility: _filterVisibility),
                _DiscoverClassesTab(query: _query),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showCreateModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => const _CreateClassSheet(),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.brand : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? AppColors.brand : Theme.of(context).dividerColor),
        ),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? Colors.white : Colors.grey)),
      ),
    );
  }
}

// ── My Classes Tab ────────────────────────────────────────────────
class _MyClassesTab extends ConsumerWidget {
  const _MyClassesTab({required this.query, required this.filterVisibility});
  final String query;
  final String filterVisibility;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final async = ref.watch(classesListProvider);

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Could not load classes', onRetry: () => ref.refresh(classesListProvider)),
      data: (classes) {
        var filtered = classes.where((c) {
          final matchQ = query.isEmpty || c.title.toLowerCase().contains(query) || (c.description ?? '').toLowerCase().contains(query);
          final matchV = filterVisibility == 'all' || c.visibility == filterVisibility;
          return matchQ && matchV;
        }).toList();

        if (filtered.isEmpty) {
          return EmptyView(
            title: query.isNotEmpty ? 'No classes found' : 'No classes yet',
            subtitle: user?.isTeacher == true ? 'Create your first class!' : 'Join a class to get started',
            icon: Icons.class_outlined,
          );
        }

        return RefreshIndicator(
          color: AppColors.brand,
          onRefresh: () async => ref.read(classesListProvider.notifier).load(),
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 1,
              childAspectRatio: 2.8,
              mainAxisSpacing: 10,
            ),
            itemCount: filtered.length,
            itemBuilder: (_, i) => _ClassCard(cls: filtered[i], currentUser: user),
          ),
        );
      },
    );
  }
}

// ── Discover Classes Tab ──────────────────────────────────────────
class _DiscoverClassesTab extends ConsumerWidget {
  const _DiscoverClassesTab({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(discoverClassesProvider);

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(message: 'Could not load classes', onRetry: () => ref.refresh(discoverClassesProvider)),
      data: (classes) {
        final filtered = query.isEmpty
            ? classes
            : classes.where((c) => c.title.toLowerCase().contains(query)).toList();

        if (filtered.isEmpty) {
          return const EmptyView(title: 'No public classes', icon: Icons.explore_outlined);
        }

        return RefreshIndicator(
          color: AppColors.brand,
          onRefresh: () => ref.refresh(discoverClassesProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _ClassCard(cls: filtered[i], isDiscover: true),
          ),
        );
      },
    );
  }
}

// ── Class Card ────────────────────────────────────────────────────
class _ClassCard extends ConsumerWidget {
  const _ClassCard({required this.cls, this.currentUser, this.isDiscover = false});
  final ClassModel cls;
  final dynamic currentUser;
  final bool isDiscover;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = _classColor(cls.id);
    final isOwner = currentUser?.id == cls.teacherId;
    final isMember = cls.isMember ?? false;
    final isPublic = cls.visibility == 'public';

    return GestureDetector(
      onTap: () => context.push('/classes/${cls.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8)],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Color accent bar
            Container(height: 4, decoration: BoxDecoration(gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.5)]))),

            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    // Left: icon
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                      child: Icon(Icons.class_outlined, color: color, size: 24),
                    ),
                    const SizedBox(width: 12),

                    // Middle: info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Badges row
                          Row(children: [
                            _Badge(label: cls.classCode ?? '', color: Colors.grey),
                            const SizedBox(width: 4),
                            _Badge(
                              label: isPublic ? '🌐 Public' : '🔒 Private',
                              color: isPublic ? AppColors.accent : Colors.grey,
                            ),
                            if (isOwner) ...[const SizedBox(width: 4), _Badge(label: 'Mine', color: color)],
                            if (isMember && !isOwner) ...[const SizedBox(width: 4), _Badge(label: '✅ Enrolled', color: AppColors.accent)],
                          ]),
                          const SizedBox(height: 4),
                          Text(cls.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                          if (cls.teacherName != null)
                            Text('👤 ${cls.teacherName}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          Row(children: [
                            const Icon(Icons.people_outline, size: 12, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text('${cls.memberCount ?? 0} students', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ]),
                        ],
                      ),
                    ),

                    // Right: action
                    const Icon(Icons.chevron_right, color: Colors.grey),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

// ── Create Class Sheet ────────────────────────────────────────────
class _CreateClassSheet extends ConsumerStatefulWidget {
  const _CreateClassSheet();
  @override
  ConsumerState<_CreateClassSheet> createState() => _CreateClassSheetState();
}

class _CreateClassSheetState extends ConsumerState<_CreateClassSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _visibility = 'public';
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
      await ref.read(classesListProvider.notifier).createClass(
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        visibility: _visibility,
      );
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger));
      }
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
              // Handle
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Create New Class', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 20),
              TextFormField(
                controller: _titleCtrl,
                decoration: const InputDecoration(labelText: 'Class title', prefixIcon: Icon(Icons.class_outlined)),
                validator: (v) => v == null || v.trim().isEmpty ? 'Title required' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _descCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Description (optional)', prefixIcon: Icon(Icons.description_outlined), alignLabelWithHint: true),
              ),
              const SizedBox(height: 14),
              const Text('Visibility', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _VisibilityOption(
                      label: '🌐 Public',
                      subtitle: 'Anyone can join',
                      selected: _visibility == 'public',
                      color: AppColors.accent,
                      onTap: () => setState(() => _visibility = 'public'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _VisibilityOption(
                      label: '🔒 Private',
                      subtitle: 'Invite only',
                      selected: _visibility == 'private',
                      color: AppColors.brand,
                      onTap: () => setState(() => _visibility = 'private'),
                    ),
                  ),
                ],
              ),
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
                      : const Text('Create Class', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
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

class _VisibilityOption extends StatelessWidget {
  const _VisibilityOption({required this.label, required this.subtitle, required this.selected, required this.color, required this.onTap});
  final String label, subtitle;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.08) : null,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? color : Theme.of(context).dividerColor, width: selected ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: selected ? color : null)),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}