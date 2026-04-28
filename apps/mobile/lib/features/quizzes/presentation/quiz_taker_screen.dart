import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/quiz.dart';
import '../../../shared/widgets/state_views.dart';
import '../data/quizzes_api.dart';
import '../providers/quizzes_provider.dart';

class QuizTakerScreen extends ConsumerStatefulWidget {
  const QuizTakerScreen({required this.quizId, super.key});
  final int quizId;

  @override
  ConsumerState<QuizTakerScreen> createState() => _QuizTakerScreenState();
}

class _QuizTakerScreenState extends ConsumerState<QuizTakerScreen> {
  QuizAttempt? _attempt;
  final Map<int, dynamic> _answers = {}; // question.id -> answer
  int _currentIndex = 0;
  bool _starting = false;
  bool _submitting = false;
  Timer? _timer;
  int _secondsLeft = 0;
  QuizAttempt? _result;
  Quiz? _quiz;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _start(Quiz quiz) async {
    if (_attempt != null || _starting) return;
    setState(() => _starting = true);
    try {
      final attempt = await ref.read(quizzesApiProvider).start(quiz.id);
      if (!mounted) return;
      setState(() {
        _attempt = attempt;
        if (quiz.timeLimitMinutes != null) {
          _secondsLeft = quiz.timeLimitMinutes! * 60;
          _startTimer();
        }
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(parseDioError(e)),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _secondsLeft--);
      if (_secondsLeft <= 0) {
        t.cancel();
        _submit();
      }
    });
  }

  String _formatTime(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _submit() async {
    if (_quiz == null || _attempt == null || _submitting) return;
    setState(() => _submitting = true);
    _timer?.cancel();
    try {
      final api = ref.read(quizzesApiProvider);
      final answersForApi = _answers.map(
        (k, v) => MapEntry(k.toString(), v),
      );
      var attempt = await api.submit(
        quizId: _quiz!.id,
        attemptId: _attempt!.id,
        answers: answersForApi,
      );

      // Trigger AI grading for essay/short answer questions
      final hasOpenEnded = _quiz!.questions.any((q) =>
          q.type == QuestionType.essay ||
          q.type == QuestionType.shortAnswer);
      if (hasOpenEnded && !attempt.isGraded) {
        try {
          attempt = await api.aiGrade(
            quizId: _quiz!.id,
            attemptId: _attempt!.id,
          );
        } catch (_) {
          // AI grading is best-effort, don't fail the whole submit
        }
      }

      if (!mounted) return;
      setState(() => _result = attempt);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(parseDioError(e)),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final quizAsync = ref.watch(quizDetailProvider(widget.quizId));

    return PopScope(
      canPop: _result != null || _attempt == null,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final confirm = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Leave quiz?'),
            content: const Text('Your progress will be lost.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Stay'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Leave'),
              ),
            ],
          ),
        );
        if (confirm == true && mounted) Navigator.of(context).pop();
      },
      child: Scaffold(
        appBar: AppBar(
          title: quizAsync.maybeWhen(
            data: (q) => Text(q.title, overflow: TextOverflow.ellipsis),
            orElse: () => const Text('Quiz'),
          ),
          actions: [
            if (_attempt != null && _secondsLeft > 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: _secondsLeft < 60
                          ? AppColors.danger.withValues(alpha: 0.15)
                          : AppColors.brand.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.timer_outlined,
                          size: 14,
                          color: _secondsLeft < 60
                              ? AppColors.danger
                              : AppColors.brand,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatTime(_secondsLeft),
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: _secondsLeft < 60
                                ? AppColors.danger
                                : AppColors.brand,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
        body: quizAsync.when(
          data: (quiz) {
            _quiz = quiz;
            if (_result != null) return _ResultView(result: _result!, quiz: quiz);
            if (_attempt == null) {
              return _IntroView(
                quiz: quiz,
                onStart: _starting ? null : () => _start(quiz),
              );
            }
            return _QuestionView(
              quiz: quiz,
              currentIndex: _currentIndex,
              answers: _answers,
              onAnswer: (qid, value) =>
                  setState(() => _answers[qid] = value),
              onPrev: () => setState(() => _currentIndex--),
              onNext: () => setState(() => _currentIndex++),
              onSubmit: _submit,
              submitting: _submitting,
            );
          },
          error: (e, _) => ErrorView(
            message: 'Could not load quiz',
            onRetry: () => ref.refresh(quizDetailProvider(widget.quizId).future),
          ),
          loading: () => const LoadingView(),
        ),
      ),
    );
  }
}

class _IntroView extends StatelessWidget {
  const _IntroView({required this.quiz, required this.onStart});
  final Quiz quiz;
  final VoidCallback? onStart;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            quiz.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          if (quiz.description != null) ...[
            const SizedBox(height: 12),
            Text(quiz.description!),
          ],
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _IntroStat(
                    icon: Icons.help_outline,
                    label: 'Questions',
                    value: '${quiz.questions.length}',
                  ),
                  const Divider(),
                  _IntroStat(
                    icon: Icons.star_outline,
                    label: 'Total points',
                    value: '${quiz.totalPoints}',
                  ),
                  if (quiz.timeLimitMinutes != null) ...[
                    const Divider(),
                    _IntroStat(
                      icon: Icons.timer_outlined,
                      label: 'Time limit',
                      value: '${quiz.timeLimitMinutes} minutes',
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 52,
            child: ElevatedButton.icon(
              onPressed: onStart,
              icon: const Icon(Icons.play_arrow),
              label: Text(onStart == null ? 'Starting...' : 'Start quiz'),
            ),
          ),
        ],
      ),
    );
  }
}

class _IntroStat extends StatelessWidget {
  const _IntroStat({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, color: AppColors.brand),
          const SizedBox(width: 12),
          Text(label),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _QuestionView extends StatelessWidget {
  const _QuestionView({
    required this.quiz,
    required this.currentIndex,
    required this.answers,
    required this.onAnswer,
    required this.onPrev,
    required this.onNext,
    required this.onSubmit,
    required this.submitting,
  });

  final Quiz quiz;
  final int currentIndex;
  final Map<int, dynamic> answers;
  final void Function(int qid, dynamic answer) onAnswer;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final VoidCallback onSubmit;
  final bool submitting;

  @override
  Widget build(BuildContext context) {
    final question = quiz.questions[currentIndex];
    final isFirst = currentIndex == 0;
    final isLast = currentIndex == quiz.questions.length - 1;
    final progress = (currentIndex + 1) / quiz.questions.length;

    return Column(
      children: [
        LinearProgressIndicator(
          value: progress,
          backgroundColor: AppColors.brand.withValues(alpha: 0.15),
          valueColor:
              const AlwaysStoppedAnimation<Color>(AppColors.brand),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Question ${currentIndex + 1} of ${quiz.questions.length}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppColors.brand,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  question.text,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),
                _AnswerInput(
                  question: question,
                  current: answers[question.id],
                  onChanged: (v) => onAnswer(question.id, v),
                ),
              ],
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isFirst ? null : onPrev,
                    child: const Text('Previous'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed:
                        submitting ? null : (isLast ? onSubmit : onNext),
                    child: submitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(isLast ? 'Submit' : 'Next'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AnswerInput extends StatelessWidget {
  const _AnswerInput({
    required this.question,
    required this.current,
    required this.onChanged,
  });

  final QuizQuestion question;
  final dynamic current;
  final ValueChanged<dynamic> onChanged;

  @override
  Widget build(BuildContext context) {
    switch (question.type) {
      case QuestionType.multipleChoice:
        return Column(
          children: question.options.map((opt) {
            final selected = current == opt;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                onTap: () => onChanged(opt),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.brand.withValues(alpha: 0.08)
                        : null,
                    border: Border.all(
                      color: selected
                          ? AppColors.brand
                          : Theme.of(context).dividerColor,
                      width: selected ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        selected
                            ? Icons.radio_button_checked
                            : Icons.radio_button_unchecked,
                        color:
                            selected ? AppColors.brand : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(opt)),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        );
      case QuestionType.trueFalse:
        return Row(
          children: [
            Expanded(
              child: _TFButton(
                label: 'True',
                selected: current == 'true',
                onTap: () => onChanged('true'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _TFButton(
                label: 'False',
                selected: current == 'false',
                onTap: () => onChanged('false'),
              ),
            ),
          ],
        );
      case QuestionType.shortAnswer:
        return TextFormField(
          key: ValueKey('short_${question.id}'),
          initialValue: current?.toString() ?? '',
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Type your answer...',
          ),
          onChanged: onChanged,
        );
      case QuestionType.essay:
        return TextFormField(
          key: ValueKey('essay_${question.id}'),
          initialValue: current?.toString() ?? '',
          maxLines: 8,
          minLines: 6,
          decoration: const InputDecoration(
            hintText: 'Write your essay response...',
          ),
          onChanged: onChanged,
        );
    }
  }
}

class _TFButton extends StatelessWidget {
  const _TFButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: selected ? AppColors.brand.withValues(alpha: 0.08) : null,
          border: Border.all(
            color: selected ? AppColors.brand : Theme.of(context).dividerColor,
            width: selected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: selected ? AppColors.brand : null,
            ),
          ),
        ),
      ),
    );
  }
}

class _ResultView extends StatelessWidget {
  const _ResultView({required this.result, required this.quiz});
  final QuizAttempt result;
  final Quiz quiz;

  @override
  Widget build(BuildContext context) {
    final pct = result.percentage ?? 0;
    final passed = pct >= 60;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: (passed ? AppColors.accent : AppColors.warning)
                  .withValues(alpha: 0.15),
            ),
            child: Icon(
              passed ? Icons.check_circle : Icons.star_outline,
              size: 64,
              color: passed ? AppColors.accent : AppColors.warning,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            passed ? 'Great job!' : 'Quiz complete',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 8),
          if (result.score != null && result.totalPoints != null)
            Text(
              '${result.score!.toStringAsFixed(1)} / ${result.totalPoints}',
              style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800),
            ),
          if (result.percentage != null)
            Text(
              '${result.percentage!.toStringAsFixed(0)}%',
              style: const TextStyle(fontSize: 18, color: AppColors.brand),
            ),
          if (!result.isGraded)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                'Some answers are awaiting grading.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () => context.go('/quizzes'),
              child: const Text('Back to quizzes'),
            ),
          ),
        ],
      ),
    );
  }
}
