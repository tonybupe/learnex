import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../data/lessons_api.dart';
import '../providers/lessons_provider.dart';

class AiGenerateLessonSheet extends ConsumerStatefulWidget {
  const AiGenerateLessonSheet({super.key});

  @override
  ConsumerState<AiGenerateLessonSheet> createState() =>
      _AiGenerateLessonSheetState();
}

class _AiGenerateLessonSheetState extends ConsumerState<AiGenerateLessonSheet> {
  final _topicCtrl = TextEditingController();
  String _gradeLevel = 'Form 3';
  String _lessonType = 'note';
  bool _generating = false;

  static const _grades = [
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
    'College',
  ];

  static const _types = [
    ('note', 'Notes'),
    ('slide', 'Slides'),
    ('reading', 'Reading'),
  ];

  @override
  void dispose() {
    _topicCtrl.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    final topic = _topicCtrl.text.trim();
    if (topic.isEmpty) return;
    setState(() => _generating = true);
    try {
      final lesson = await ref.read(lessonsApiProvider).aiGenerate(
            topic: topic,
            gradeLevel: _gradeLevel,
            lessonType: _lessonType,
          );
      if (!mounted) return;
      ref.invalidate(lessonsListProvider);
      Navigator.of(context).pop();
      context.push('/lessons/${lesson.id}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(parseDioError(e)),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.brand, AppColors.brandDark],
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.auto_awesome,
                        color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'AI Lesson Generator',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Claude will draft a complete lesson with objectives, examples, and review questions.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _topicCtrl,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Topic',
                  hintText: 'e.g. Photosynthesis, Quadratic equations',
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _gradeLevel,
                decoration: const InputDecoration(labelText: 'Grade level'),
                items: _grades
                    .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                    .toList(),
                onChanged: (v) =>
                    v != null ? setState(() => _gradeLevel = v) : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _lessonType,
                decoration: const InputDecoration(labelText: 'Format'),
                items: _types
                    .map((t) =>
                        DropdownMenuItem(value: t.$1, child: Text(t.$2)))
                    .toList(),
                onChanged: (v) =>
                    v != null ? setState(() => _lessonType = v) : null,
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _generating ? null : _generate,
                  icon: _generating
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(_generating ? 'Generating...' : 'Generate lesson'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
