import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../models/quiz.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/quizzes_provider.dart';

class QuizzesScreen extends ConsumerWidget {
  const QuizzesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final async = ref.watch(quizzesListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Quizzes')),
      floatingActionButton: (user?.isTeacher ?? false)
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.brand,
              icon: const Icon(Icons.auto_awesome, color: Colors.white),
              label: const Text('AI generate',
                  style: TextStyle(color: Colors.white)),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Quiz AI generation - coming next iteration'),
                  ),
                );
              },
            )
          : null,
      body: async.when(
        data: (quizzes) {
          if (quizzes.isEmpty) {
            return const EmptyView(
              title: 'No quizzes yet',
              subtitle: 'Published quizzes will appear here.',
              icon: Icons.quiz_outlined,
            );
          }
          return RefreshIndicator(
            color: AppColors.brand,
            onRefresh: () async => ref.refresh(quizzesListProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: quizzes.length,
              itemBuilder: (_, i) => _QuizCard(quiz: quizzes[i]),
            ),
          );
        },
        error: (e, _) => ErrorView(
          message: 'Could not load quizzes',
          onRetry: () => ref.refresh(quizzesListProvider.future),
        ),
        loading: () => const LoadingView(),
      ),
    );
  }
}

class _QuizCard extends StatelessWidget {
  const _QuizCard({required this.quiz});
  final Quiz quiz;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => context.push('/quizzes/${quiz.id}/take'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.quiz, color: AppColors.accent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          quiz.title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (quiz.subjectName != null ||
                            quiz.className != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            [
                              if (quiz.subjectName != null) quiz.subjectName!,
                              if (quiz.className != null) quiz.className!,
                            ].join(' · '),
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              if (quiz.description != null) ...[
                const SizedBox(height: 10),
                Text(
                  quiz.description!,
                  style: const TextStyle(fontSize: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _Stat(
                    icon: Icons.help_outline,
                    label: '${quiz.questions.length} qns',
                  ),
                  const SizedBox(width: 16),
                  _Stat(
                    icon: Icons.star_outline,
                    label: '${quiz.totalPoints} pts',
                  ),
                  if (quiz.timeLimitMinutes != null) ...[
                    const SizedBox(width: 16),
                    _Stat(
                      icon: Icons.timer_outlined,
                      label: '${quiz.timeLimitMinutes}m',
                    ),
                  ],
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => context.push('/quizzes/${quiz.id}/take'),
                    icon: const Icon(Icons.play_arrow, size: 18),
                    label: const Text('Start'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
