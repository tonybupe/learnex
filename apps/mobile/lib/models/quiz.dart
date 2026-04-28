enum QuestionType {
  multipleChoice,
  trueFalse,
  shortAnswer,
  essay;

  static QuestionType fromString(String? value) {
    return switch ((value ?? '').toLowerCase()) {
      'multiple_choice' || 'mcq' || 'multiplechoice' => QuestionType.multipleChoice,
      'true_false' || 'truefalse' => QuestionType.trueFalse,
      'short_answer' || 'shortanswer' => QuestionType.shortAnswer,
      'essay' => QuestionType.essay,
      _ => QuestionType.multipleChoice,
    };
  }

  String get apiValue => switch (this) {
        QuestionType.multipleChoice => 'multiple_choice',
        QuestionType.trueFalse => 'true_false',
        QuestionType.shortAnswer => 'short_answer',
        QuestionType.essay => 'essay',
      };

  String get label => switch (this) {
        QuestionType.multipleChoice => 'Multiple Choice',
        QuestionType.trueFalse => 'True / False',
        QuestionType.shortAnswer => 'Short Answer',
        QuestionType.essay => 'Essay',
      };
}

class QuizQuestion {
  const QuizQuestion({
    required this.id,
    required this.text,
    required this.type,
    this.options = const [],
    this.correctAnswer,
    this.points = 1,
    this.explanation,
  });

  final int id;
  final String text;
  final QuestionType type;
  final List<String> options;
  final String? correctAnswer;
  final int points;
  final String? explanation;

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: (json['id'] as num).toInt(),
      text: json['text'] as String? ?? json['question'] as String? ?? '',
      type: QuestionType.fromString(json['type'] as String?),
      options: (json['options'] as List?)?.map((e) => e.toString()).toList() ?? [],
      correctAnswer: json['correct_answer']?.toString(),
      points: (json['points'] as num?)?.toInt() ?? 1,
      explanation: json['explanation'] as String?,
    );
  }
}

class Quiz {
  const Quiz({
    required this.id,
    required this.title,
    this.description,
    this.classId,
    this.className,
    this.lessonId,
    this.subjectId,
    this.subjectName,
    this.timeLimitMinutes,
    this.totalPoints = 0,
    this.questions = const [],
    this.attemptCount = 0,
    this.averageScore,
    this.isPublished = false,
    this.createdAt,
  });

  final int id;
  final String title;
  final String? description;
  final int? classId;
  final String? className;
  final int? lessonId;
  final int? subjectId;
  final String? subjectName;
  final int? timeLimitMinutes;
  final int totalPoints;
  final List<QuizQuestion> questions;
  final int attemptCount;
  final double? averageScore;
  final bool isPublished;
  final DateTime? createdAt;

  factory Quiz.fromJson(Map<String, dynamic> json) {
    return Quiz(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      classId: (json['class_id'] as num?)?.toInt(),
      className: json['class_name'] as String?,
      lessonId: (json['lesson_id'] as num?)?.toInt(),
      subjectId: (json['subject_id'] as num?)?.toInt(),
      subjectName: json['subject_name'] as String?,
      timeLimitMinutes: (json['time_limit_minutes'] as num?)?.toInt(),
      totalPoints: (json['total_points'] as num?)?.toInt() ?? 0,
      questions: (json['questions'] as List?)
              ?.map((e) => QuizQuestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      attemptCount: (json['attempt_count'] as num?)?.toInt() ?? 0,
      averageScore: (json['average_score'] as num?)?.toDouble(),
      isPublished: json['is_published'] as bool? ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}

class QuizAttempt {
  const QuizAttempt({
    required this.id,
    required this.quizId,
    this.userId,
    this.userName,
    this.score,
    this.totalPoints,
    this.startedAt,
    this.submittedAt,
    this.answers = const {},
    this.isGraded = false,
  });

  final int id;
  final int quizId;
  final int? userId;
  final String? userName;
  final double? score;
  final int? totalPoints;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final Map<String, dynamic> answers;
  final bool isGraded;

  double? get percentage {
    if (score == null || totalPoints == null || totalPoints == 0) return null;
    return (score! / totalPoints!) * 100;
  }

  factory QuizAttempt.fromJson(Map<String, dynamic> json) {
    return QuizAttempt(
      id: (json['id'] as num).toInt(),
      quizId: (json['quiz_id'] as num).toInt(),
      userId: (json['user_id'] as num?)?.toInt(),
      userName: json['user_name'] as String?,
      score: (json['score'] as num?)?.toDouble(),
      totalPoints: (json['total_points'] as num?)?.toInt(),
      startedAt: json['started_at'] != null
          ? DateTime.tryParse(json['started_at'] as String)
          : null,
      submittedAt: json['submitted_at'] != null
          ? DateTime.tryParse(json['submitted_at'] as String)
          : null,
      answers: (json['answers'] as Map<String, dynamic>?) ?? {},
      isGraded: json['is_graded'] as bool? ?? false,
    );
  }
}
