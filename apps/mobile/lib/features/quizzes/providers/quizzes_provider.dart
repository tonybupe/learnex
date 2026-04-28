import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/quiz.dart';
import '../data/quizzes_api.dart';

final quizzesListProvider = FutureProvider<List<Quiz>>((ref) async {
  return ref.watch(quizzesApiProvider).list(published: true);
});

final quizDetailProvider =
    FutureProvider.family<Quiz, int>((ref, id) async {
  return ref.watch(quizzesApiProvider).get(id);
});

final quizAttemptsProvider =
    FutureProvider.family<List<QuizAttempt>, int>((ref, quizId) async {
  return ref.watch(quizzesApiProvider).attempts(quizId);
});
