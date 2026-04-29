import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../providers/lessons_provider.dart';

// ── AI Result Model ───────────────────────────────────────────────
class AiResult {
  AiResult({
    required this.content,
    required this.summary,
    this.keyTerms = const [],
    this.youtubeSearches = const [],
    this.resourceLinks = const [],
    this.presentationSlides = const [],
    this.diagramSuggestions = const [],
  });

  final String content;
  final String summary;
  final List<Map<String, String>> keyTerms;
  final List<String> youtubeSearches;
  final List<Map<String, String>> resourceLinks;
  final List<Map<String, dynamic>> presentationSlides;
  final List<String> diagramSuggestions;

  factory AiResult.fromJson(Map<String, dynamic> json) {
    return AiResult(
      content: json['content'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      keyTerms: (json['key_terms'] as List? ?? [])
          .map((e) => Map<String, String>.from(e as Map))
          .toList(),
      youtubeSearches: (json['youtube_searches'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      resourceLinks: (json['resource_links'] as List? ?? [])
          .map((e) => Map<String, String>.from(e as Map))
          .toList(),
      presentationSlides: (json['presentation_slides'] as List? ?? [])
          .map((e) => e as Map<String, dynamic>)
          .toList(),
      diagramSuggestions: (json['diagram_suggestions'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
    );
  }
}

// ── Full Create Lesson Sheet matching web ─────────────────────────
class AiGenerateLessonSheet extends ConsumerStatefulWidget {
  const AiGenerateLessonSheet({super.key});

  @override
  ConsumerState<AiGenerateLessonSheet> createState() =>
      _AiGenerateLessonSheetState();
}

class _AiGenerateLessonSheetState
    extends ConsumerState<AiGenerateLessonSheet> {
  // Form fields matching web
  final _titleCtrl = TextEditingController();
  final _subtopicCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();

  String _lessonType = 'note';
  String _status = 'published';
  String _visibility = 'class';
  String _level = 'secondary';
  String _selectedClassId = '';
  String _selectedSubjectId = '';

  // AI state
  bool _aiLoading = false;
  String _aiError = '';
  AiResult? _aiResult;

  // Submit state
  bool _submitting = false;
  String _formError = '';

  // Data
  List<Map<String, dynamic>> _myClasses = [];
  List<Map<String, dynamic>> _subjects = [];
  bool _loadingData = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _subtopicCtrl.dispose();
    _descCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final dio = ref.read(dioProvider);
    try {
      final classRes = await dio.get('/classes', queryParameters: {'mine': true});
      final subjectRes = await dio.get('/subjects');
      final classList = classRes.data is List
          ? classRes.data as List
          : (classRes.data['items'] as List? ?? []);
      final subjectList = subjectRes.data is List
          ? subjectRes.data as List
          : (subjectRes.data['items'] as List? ?? []);

      if (mounted) {
        setState(() {
          _myClasses = classList.cast<Map<String, dynamic>>();
          _subjects = subjectList.cast<Map<String, dynamic>>();
          _loadingData = false;
          if (_myClasses.isNotEmpty) {
            _selectedClassId = _myClasses.first['id'].toString();
          }
          if (_subjects.isNotEmpty) {
            _selectedSubjectId = _subjects.first['id'].toString();
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingData = false);
    }
  }

  Future<void> _aiGenerate() async {
    final topic = _titleCtrl.text.trim();
    if (topic.isEmpty) {
      setState(() => _aiError = 'Enter a topic / title first');
      return;
    }
    setState(() { _aiLoading = true; _aiError = ''; _aiResult = null; });
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.post('/lessons/ai/generate', data: {
        'topic': topic,
        'subtopic': _subtopicCtrl.text.trim(),
        'level': _level,
      });
      final result = AiResult.fromJson(res.data as Map<String, dynamic>);
      if (mounted) {
        setState(() {
          _aiResult = result;
          _contentCtrl.text = result.content;
          _aiLoading = false;
        });
      }
    } catch (e) {
      final msg = e.toString();
      String errMsg;
      if (msg.contains('402') || msg.toLowerCase().contains('credit') || msg.toLowerCase().contains('balance')) {
        errMsg = 'AI credits exhausted. Top up at console.anthropic.com to continue.';
      } else if (msg.contains('404')) {
        errMsg = 'AI generation endpoint not found. Check API connection.';
      } else {
        errMsg = 'Generation failed: $msg';
      }
      if (mounted) setState(() { _aiError = errMsg; _aiLoading = false; });
    }
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    final content = _contentCtrl.text.trim();

    if (title.isEmpty) { setState(() => _formError = 'Title is required'); return; }
    if (content.isEmpty) { setState(() => _formError = 'Content is required — use AI Generate or write manually'); return; }
    if (_selectedClassId.isEmpty) { setState(() => _formError = 'Please select a class'); return; }
    if (_selectedSubjectId.isEmpty) { setState(() => _formError = 'Please select a subject'); return; }

    setState(() { _submitting = true; _formError = ''; });
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/lessons', data: {
        'title': title,
        if (_descCtrl.text.trim().isNotEmpty) 'description': _descCtrl.text.trim(),
        'content': content,
        'class_id': int.parse(_selectedClassId),
        'subject_id': int.parse(_selectedSubjectId),
        'lesson_type': _lessonType,
        'status': _status,
        'visibility': _visibility,
      });
      ref.refresh(lessonsListProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() { _formError = e.toString(); _submitting = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.95,
      minChildSize: 0.5,
      maxChildSize: 0.98,
      expand: false,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle + header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
              ),
              child: Column(
                children: [
                  Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.brand, Color(0xFF8B5CF6)]), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.add_circle_outline, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Create New Lesson', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                            Text('Fill in details or use AI to generate content', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      ),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                    ],
                  ),
                ],
              ),
            ),

            // Body
            Expanded(
              child: _loadingData
                  ? const Center(child: CircularProgressIndicator(color: AppColors.brand))
                  : ListView(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.all(16),
                      children: [
                        // ── No classes warning ──
                        if (_myClasses.isEmpty)
                          _WarningBanner(
                            icon: Icons.warning_amber_outlined,
                            color: AppColors.warning,
                            message: "You don't have any classes yet. Create a class first.",
                            actionLabel: 'Go to Classes',
                            onAction: () { Navigator.pop(context); },
                          ),

                        // ── Teacher notice ──
                        _InfoBanner(
                          icon: '🔒',
                          message: 'You can only create lessons in your own classes.',
                        ),
                        const SizedBox(height: 14),

                        // ── Title + Subtopic ──
                        Row(children: [
                          Expanded(child: _FormField(
                            label: 'Topic / Title *',
                            child: TextField(
                              controller: _titleCtrl,
                              onChanged: (_) => setState(() {}),
                              decoration: const InputDecoration(hintText: 'e.g. Photosynthesis, World War II...'),
                            ),
                          )),
                          const SizedBox(width: 10),
                          Expanded(child: _FormField(
                            label: 'Subtopic (optional)',
                            child: TextField(
                              controller: _subtopicCtrl,
                              decoration: const InputDecoration(hintText: 'e.g. Light reactions...'),
                            ),
                          )),
                        ]),
                        const SizedBox(height: 14),

                        // ── AI Generator Section ──
                        _AiGeneratorSection(
                          topic: _titleCtrl.text,
                          subtopic: _subtopicCtrl.text,
                          level: _level,
                          loading: _aiLoading,
                          error: _aiError,
                          result: _aiResult,
                          onLevelChange: (v) => setState(() => _level = v),
                          onGenerate: _aiGenerate,
                        ),
                        const SizedBox(height: 14),

                        // ── Description ──
                        _FormField(
                          label: 'Description',
                          child: TextField(
                            controller: _descCtrl,
                            decoration: const InputDecoration(hintText: 'Brief overview of this lesson...'),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // ── Content Editor ──
                        _FormField(
                          label: 'Content *',
                          labelSuffix: _contentCtrl.text.isNotEmpty
                              ? const Row(mainAxisSize: MainAxisSize.min, children: [
                                  Icon(Icons.check_circle, size: 13, color: AppColors.accent),
                                  SizedBox(width: 4),
                                  Text('Content loaded — edit below', style: TextStyle(fontSize: 11, color: AppColors.accent, fontWeight: FontWeight.w600)),
                                ])
                              : null,
                          child: TextField(
                            controller: _contentCtrl,
                            maxLines: 15,
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              hintText: 'Write your lesson content here, or use AI Generate above...\n\nUse # for H1 headings\n## for H2 sections\n### for H3\n- for bullet points\n**bold** for emphasis\n> for quotes',
                              alignLabelWithHint: true,
                              contentPadding: EdgeInsets.all(14),
                            ),
                            style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.6),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // ── Class + Subject + Type ──
                        Column(children: [
                          Row(children: [
                            Expanded(child: _FormField(
                              label: 'Class * (your classes only)',
                              child: _myClasses.isEmpty
                                  ? Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: Theme.of(context).dividerColor),
                                      ),
                                      child: const Text('No classes — create one first', style: TextStyle(color: Colors.grey, fontSize: 13)),
                                    )
                                  : DropdownButtonFormField<String>(
                                      value: _selectedClassId.isEmpty ? null : _selectedClassId,
                                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                                      hint: const Text('Select your class...'),
                                      items: _myClasses.map((c) => DropdownMenuItem(
                                        value: c['id'].toString(),
                                        child: Text('${c['title'] ?? c['name']} (${c['class_code'] ?? ''})', overflow: TextOverflow.ellipsis),
                                      )).toList(),
                                      onChanged: (v) { if (v != null) setState(() => _selectedClassId = v); },
                                    ),
                            )),
                            const SizedBox(width: 10),
                            Expanded(child: _FormField(
                              label: 'Subject *',
                              child: DropdownButtonFormField<String>(
                                value: _selectedSubjectId.isEmpty ? null : _selectedSubjectId,
                                decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                                hint: const Text('Select subject...'),
                                items: _subjects.map((s) => DropdownMenuItem(
                                  value: s['id'].toString(),
                                  child: Text(s['name'] as String? ?? '', overflow: TextOverflow.ellipsis),
                                )).toList(),
                                onChanged: (v) { if (v != null) setState(() => _selectedSubjectId = v); },
                              ),
                            )),
                          ]),
                          const SizedBox(height: 12),
                          _FormField(
                            label: 'Lesson Type',
                            child: DropdownButtonFormField<String>(
                              value: _lessonType,
                              decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                              items: const [
                                DropdownMenuItem(value: 'note', child: Text('📝 Note')),
                                DropdownMenuItem(value: 'video', child: Text('🎥 Video')),
                                DropdownMenuItem(value: 'live', child: Text('🔴 Live')),
                                DropdownMenuItem(value: 'assignment', child: Text('📋 Assignment')),
                              ],
                              onChanged: (v) { if (v != null) setState(() => _lessonType = v); },
                            ),
                          ),
                        ]),
                        const SizedBox(height: 14),

                        // ── Status + Visibility ──
                        Row(children: [
                          Expanded(child: _FormField(
                            label: 'Status',
                            child: DropdownButtonFormField<String>(
                              value: _status,
                              decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                              items: const [
                                DropdownMenuItem(value: 'draft', child: Text('Draft')),
                                DropdownMenuItem(value: 'published', child: Text('Published')),
                              ],
                              onChanged: (v) { if (v != null) setState(() => _status = v); },
                            ),
                          )),
                          const SizedBox(width: 10),
                          Expanded(child: _FormField(
                            label: 'Visibility',
                            child: DropdownButtonFormField<String>(
                              value: _visibility,
                              decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                              items: const [
                                DropdownMenuItem(value: 'class', child: Text('🔒 Class only')),
                                DropdownMenuItem(value: 'public', child: Text('🌐 Public')),
                              ],
                              onChanged: (v) { if (v != null) setState(() => _visibility = v); },
                            ),
                          )),
                        ]),
                        const SizedBox(height: 16),

                        // ── Error ──
                        if (_formError.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
                            ),
                            child: Row(children: [
                              const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
                              const SizedBox(width: 8),
                              Expanded(child: Text(_formError, style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600))),
                            ]),
                          ),

                        const SizedBox(height: 16),

                        // ── Actions ──
                        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                          OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancel'),
                          ),
                          const SizedBox(width: 10),
                          ElevatedButton(
                            onPressed: (_submitting || _myClasses.isEmpty) ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.brand, foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                            child: _submitting
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Create Lesson', style: TextStyle(fontWeight: FontWeight.w700)),
                          ),
                        ]),
                        const SizedBox(height: 32),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── AI Generator Section ──────────────────────────────────────────
class _AiGeneratorSection extends StatelessWidget {
  const _AiGeneratorSection({
    required this.topic, required this.subtopic, required this.level,
    required this.loading, required this.error, required this.result,
    required this.onLevelChange, required this.onGenerate,
  });

  final String topic, subtopic, level;
  final bool loading;
  final String error;
  final AiResult? result;
  final ValueChanged<String> onLevelChange;
  final VoidCallback onGenerate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                const Icon(Icons.auto_awesome, size: 16, color: AppColors.brand),
                const SizedBox(width: 6),
                const Text('AI Content Generator', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.brand)),
              ]),
              TextButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.star_outline, size: 12, color: AppColors.warning),
                label: const Text('Upgrade for more AI', style: TextStyle(fontSize: 11, color: AppColors.warning)),
                style: TextButton.styleFrom(padding: EdgeInsets.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Level selector
          Row(children: [
            const Text('Education Level:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(width: 10),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: level,
                isDense: true,
                decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
                items: const [
                  DropdownMenuItem(value: 'primary', child: Text('Primary', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'secondary', child: Text('Secondary', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'college', child: Text('College', style: TextStyle(fontSize: 13))),
                  DropdownMenuItem(value: 'university', child: Text('University', style: TextStyle(fontSize: 13))),
                ],
                onChanged: (v) { if (v != null) onLevelChange(v); },
              ),
            ),
          ]),
          const SizedBox(height: 12),

          // Topic display
          if (topic.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.brand.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(children: [
                const Icon(Icons.lightbulb_outline, size: 14, color: AppColors.brand),
                const SizedBox(width: 6),
                Expanded(child: Text('Topic: $topic${subtopic.isNotEmpty ? ' · $subtopic' : ''}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.brand))),
              ]),
            ),
          if (topic.isNotEmpty) const SizedBox(height: 10),

          // Error
          if (error.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.danger.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8)),
              child: Row(children: [
                const Icon(Icons.error_outline, size: 14, color: AppColors.danger),
                const SizedBox(width: 6),
                Expanded(child: Text(error, style: const TextStyle(fontSize: 12, color: AppColors.danger))),
              ]),
            ),
            const SizedBox(height: 10),
          ],

          // Generate button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: (loading || topic.isEmpty) ? null : onGenerate,
              icon: loading
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.auto_awesome, size: 14),
              label: Text(loading ? 'Generating lesson... (30-60s)' : 'Generate with AI'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.brand, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
            ),
          ),

          // Results
          if (result != null) ...[
            const SizedBox(height: 14),
            const Divider(),
            const SizedBox(height: 10),
            const Row(children: [
              Icon(Icons.check_circle, size: 14, color: AppColors.accent),
              SizedBox(width: 6),
              Text('Content generated! Scroll down to edit.', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.accent)),
            ]),

            // Key terms
            if (result!.keyTerms.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('📖 Key Terms', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Wrap(spacing: 6, runSpacing: 6, children: result!.keyTerms.map((t) => Tooltip(
                message: t['definition'] ?? '',
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.brand.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
                  ),
                  child: Text(t['term'] ?? '', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.brand)),
                ),
              )).toList()),
            ],

            // YouTube suggestions
            if (result!.youtubeSearches.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('🎥 Video Suggestions', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              ...result!.youtubeSearches.take(3).map((q) => Container(
                margin: const EdgeInsets.only(bottom: 4),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  const Icon(Icons.play_circle_outline, size: 13, color: AppColors.danger),
                  const SizedBox(width: 6),
                  Expanded(child: Text(q, style: const TextStyle(fontSize: 12, color: AppColors.danger))),
                ]),
              )),
            ],

            // Slide outline
            if (result!.presentationSlides.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('📊 Slide Outline', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              ...result!.presentationSlides.take(4).map((s) => Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Theme.of(context).dividerColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Slide ${s['slide']}: ${s['title']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.brand)),
                    const SizedBox(height: 4),
                    ...((s['points'] as List? ?? []).take(3).map((p) => Padding(
                      padding: const EdgeInsets.only(left: 8, top: 2),
                      child: Text('• $p', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ))),
                  ],
                ),
              )),
            ],

            // Resource links
            if (result!.resourceLinks.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('🔗 Resource Links', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              ...result!.resourceLinks.take(3).map((r) => Container(
                margin: const EdgeInsets.only(bottom: 4),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF38BDF8).withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  const Icon(Icons.link, size: 13, color: Color(0xFF38BDF8)),
                  const SizedBox(width: 6),
                  Expanded(child: Text(r['title'] ?? r['url'] ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF38BDF8)))),
                ]),
              )),
            ],
          ],
        ],
      ),
    );
  }
}

// ── Shared Widgets ────────────────────────────────────────────────
class _FormField extends StatelessWidget {
  const _FormField({required this.label, required this.child, this.labelSuffix});
  final String label;
  final Widget child;
  final Widget? labelSuffix;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.2)),
          if (labelSuffix != null) ...[const SizedBox(width: 8), labelSuffix!],
        ]),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}

class _WarningBanner extends StatelessWidget {
  const _WarningBanner({required this.icon, required this.color, required this.message, required this.actionLabel, required this.onAction});
  final IconData icon;
  final Color color;
  final String message, actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 8),
        Expanded(child: Text(message, style: TextStyle(color: color, fontSize: 13))),
        TextButton(onPressed: onAction, style: TextButton.styleFrom(foregroundColor: color, padding: const EdgeInsets.symmetric(horizontal: 8)),
            child: Text(actionLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
      ]),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.icon, required this.message});
  final String icon, message;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
      ),
      child: Row(children: [
        Text(icon, style: const TextStyle(fontSize: 14)),
        const SizedBox(width: 8),
        Expanded(child: Text(message, style: const TextStyle(fontSize: 13, color: Colors.grey))),
      ]),
    );
  }
}