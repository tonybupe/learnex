import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/dio_client.dart';
import '../../core/theme/app_colors.dart';

// ── Subject Model ─────────────────────────────────────────────────
class Subject {
  const Subject({required this.id, required this.name, required this.code, this.description});
  final int id;
  final String name;
  final String code;
  final String? description;

  factory Subject.fromJson(Map<String, dynamic> json) => Subject(
    id: (json['id'] as num).toInt(),
    name: json['name'] as String? ?? '',
    code: json['code'] as String? ?? '',
    description: json['description'] as String?,
  );
}

// ── Providers ─────────────────────────────────────────────────────
final subjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/subjects');
    final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
    return list.map((e) => Subject.fromJson(e as Map<String, dynamic>)).toList();
  } catch (_) { return []; }
});

final mySubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/subjects', queryParameters: {'mine': true});
    final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
    return list.map((e) => Subject.fromJson(e as Map<String, dynamic>)).toList();
  } catch (_) { return []; }
});

// ── Subject Selector Widget ───────────────────────────────────────
class SubjectSelector extends ConsumerStatefulWidget {
  const SubjectSelector({
    required this.value,
    required this.onChange,
    this.showMineOnly = true,
    this.required = false,
    super.key,
  });

  final String value;
  final ValueChanged<String> onChange;
  final bool showMineOnly;
  final bool required;

  @override
  ConsumerState<SubjectSelector> createState() => _SubjectSelectorState();
}

class _SubjectSelectorState extends ConsumerState<SubjectSelector> {
  bool _open = false;
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final subjectsAsync = widget.showMineOnly
        ? ref.watch(mySubjectsProvider)
        : ref.watch(subjectsProvider);
    final allSubjectsAsync = ref.watch(subjectsProvider);

    final subjects = subjectsAsync.value ?? [];
    final allSubjects = allSubjectsAsync.value ?? [];

    // Find selected subject in either list
    Subject? selected;
    if (widget.value.isNotEmpty) {
      try {
        selected = subjects.firstWhere((s) => s.id.toString() == widget.value);
      } catch (_) {
        try {
          selected = allSubjects.firstWhere((s) => s.id.toString() == widget.value);
        } catch (_) {}
      }
    }

    final filtered = _query.isEmpty
        ? subjects
        : subjects.where((s) =>
            s.name.toLowerCase().contains(_query) ||
            s.code.toLowerCase().contains(_query)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Selector button matching web ──
        GestureDetector(
          onTap: () => setState(() => _open = !_open),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: selected != null
                  ? AppColors.brand.withValues(alpha: 0.04)
                  : Theme.of(context).brightness == Brightness.dark
                      ? const Color(0xFF27272A)
                      : const Color(0xFFF4F4F5),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _open
                    ? AppColors.brand
                    : selected != null
                        ? AppColors.brand.withValues(alpha: 0.35)
                        : Theme.of(context).dividerColor,
                width: _open ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.menu_book_outlined, size: 16, color: selected != null ? AppColors.brand : Colors.grey),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    selected != null
                        ? selected.name
                        : subjectsAsync.isLoading
                            ? 'Loading subjects...'
                            : subjects.isEmpty
                                ? 'No subjects yet — create one'
                                : 'Select a subject...',
                    style: TextStyle(
                      fontSize: 14,
                      color: selected != null ? Theme.of(context).textTheme.bodyLarge?.color : Colors.grey,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (selected != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.brand.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(selected.code, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.brand)),
                  ),
                  const SizedBox(width: 6),
                ],
                Icon(_open ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, size: 18, color: Colors.grey),
              ],
            ),
          ),
        ),

        // ── Dropdown panel matching web ──
        if (_open) ...[
          const SizedBox(height: 4),
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 16, offset: const Offset(0, 4))],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Search bar
                Container(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor))),
                  child: Row(
                    children: [
                      const Icon(Icons.search, size: 14, color: Colors.grey),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _searchCtrl,
                          autofocus: true,
                          onChanged: (v) => setState(() => _query = v.toLowerCase()),
                          decoration: const InputDecoration.collapsed(hintText: 'Search subjects...'),
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      if (_query.isNotEmpty)
                        GestureDetector(
                          onTap: () { _searchCtrl.clear(); setState(() => _query = ''); },
                          child: const Icon(Icons.close, size: 13, color: Colors.grey),
                        ),
                    ],
                  ),
                ),

                // Subject list
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 220),
                  child: subjectsAsync.isLoading
                      ? const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator(color: AppColors.brand)))
                      : filtered.isEmpty
                          ? Padding(
                              padding: const EdgeInsets.all(20),
                              child: Center(
                                child: Text(
                                  subjects.isEmpty ? 'You have no subjects yet.' : 'No match found.',
                                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            )
                          : ListView.builder(
                              shrinkWrap: true,
                              itemCount: filtered.length,
                              itemBuilder: (_, i) {
                                final s = filtered[i];
                                final isSelected = s.id.toString() == widget.value;
                                return GestureDetector(
                                  onTap: () {
                                    widget.onChange(s.id.toString());
                                    setState(() { _open = false; _query = ''; _searchCtrl.clear(); });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isSelected ? AppColors.brand.withValues(alpha: 0.06) : null,
                                      border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 34, height: 34,
                                          decoration: BoxDecoration(
                                            color: AppColors.brand.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(9),
                                          ),
                                          child: const Icon(Icons.menu_book_outlined, size: 15, color: AppColors.brand),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                              Text(
                                                '${s.code}${s.description != null ? ' · ${s.description!.length > 45 ? '${s.description!.substring(0, 45)}...' : s.description!}' : ''}',
                                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (isSelected)
                                          const Icon(Icons.check, size: 15, color: AppColors.brand),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                ),

                // Create new subject button matching web
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).dividerColor))),
                  child: GestureDetector(
                    onTap: () {
                      setState(() { _open = false; _query = ''; _searchCtrl.clear(); });
                      showDialog(
                        context: context,
                        builder: (_) => _CreateSubjectDialog(
                          onCreated: (s) {
                            widget.onChange(s.id.toString());
                            ref.refresh(subjectsProvider);
                            ref.refresh(mySubjectsProvider);
                          },
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: AppColors.brand.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(color: AppColors.brand.withValues(alpha: 0.4), style: BorderStyle.solid),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add, size: 14, color: AppColors.brand),
                          SizedBox(width: 6),
                          Text('Create New Subject', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.brand)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

// ── Create Subject Dialog matching web modal exactly ──────────────
class _CreateSubjectDialog extends ConsumerStatefulWidget {
  const _CreateSubjectDialog({required this.onCreated});
  final ValueChanged<Subject> onCreated;

  @override
  ConsumerState<_CreateSubjectDialog> createState() => _CreateSubjectDialogState();
}

class _CreateSubjectDialogState extends ConsumerState<_CreateSubjectDialog> {
  final _nameCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _nameCtrl.dispose();
    _codeCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final code = _codeCtrl.text.trim().toUpperCase();
    if (name.isEmpty) { setState(() => _error = 'Name is required'); return; }
    if (code.isEmpty) { setState(() => _error = 'Code is required'); return; }

    setState(() { _loading = true; _error = ''; });
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.post('/subjects', data: {
        'name': name,
        'code': code,
        if (_descCtrl.text.trim().isNotEmpty) 'description': _descCtrl.text.trim(),
      });
      final subject = Subject.fromJson(res.data as Map<String, dynamic>);
      ref.refresh(subjectsProvider);
      ref.refresh(mySubjectsProvider);
      if (mounted) {
        Navigator.pop(context);
        widget.onCreated(subject);
      }
    } catch (e) {
      final msg = e.toString();
      if (mounted) setState(() {
        _error = msg.contains('already exists') ? 'Subject code already exists' : 'Failed to create subject';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.hardEdge,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Header matching web ──
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.brand.withValues(alpha: 0.08), Colors.transparent],
                ),
                border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.brand.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
                    ),
                    child: const Icon(Icons.menu_book_outlined, size: 15, color: AppColors.brand),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('New Subject', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        Text('Create a subject for your classes', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    color: Colors.grey,
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),

            // ── Form body ──
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Error
                  if (_error.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
                      ),
                      child: Text(_error, style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Subject Name
                  _DialogField(
                    label: 'Subject Name *',
                    child: TextField(
                      controller: _nameCtrl,
                      autofocus: true,
                      decoration: const InputDecoration(hintText: 'e.g. Mathematics, Biology, ICT...'),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Subject Code
                  _DialogField(
                    label: 'Subject Code *',
                    labelSuffix: 'unique short code',
                    child: TextField(
                      controller: _codeCtrl,
                      textCapitalization: TextCapitalization.characters,
                      maxLength: 30,
                      decoration: const InputDecoration(
                        hintText: 'e.g. MATH, BIO, ICT...',
                        counterText: '',
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Description
                  _DialogField(
                    label: 'Description',
                    labelSuffix: 'optional',
                    child: TextField(
                      controller: _descCtrl,
                      decoration: const InputDecoration(hintText: 'Brief description of this subject...'),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Buttons matching web
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton.icon(
                        onPressed: _loading ? null : _submit,
                        icon: _loading
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.add, size: 14),
                        label: Text(_loading ? 'Creating...' : 'Create Subject'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brand,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
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
}

class _DialogField extends StatelessWidget {
  const _DialogField({required this.label, required this.child, this.labelSuffix});
  final String label;
  final Widget child;
  final String? labelSuffix;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          if (labelSuffix != null) ...[
            const SizedBox(width: 6),
            Text(labelSuffix!, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w400)),
          ],
        ]),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}