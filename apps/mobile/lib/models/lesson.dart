enum LessonType {
  note,
  slide,
  video,
  reading;

  static LessonType fromString(String? value) {
    return LessonType.values.firstWhere(
      (t) => t.name == (value ?? '').toLowerCase(),
      orElse: () => LessonType.note,
    );
  }
}

class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    this.content,
    this.summary,
    this.lessonType = LessonType.note,
    this.classId,
    this.className,
    this.subjectId,
    this.subjectName,
    this.gradeLevel,
    this.authorId,
    this.authorName,
    this.authorAvatar,
    this.isPublished = false,
    this.coverImageUrl,
    this.createdAt,
    this.updatedAt,
  });

  final int id;
  final String title;
  final String? content; // HTML
  final String? summary;
  final LessonType lessonType;
  final int? classId;
  final String? className;
  final int? subjectId;
  final String? subjectName;
  final String? gradeLevel;
  final int? authorId;
  final String? authorName;
  final String? authorAvatar;
  final bool isPublished;
  final String? coverImageUrl;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Lesson.fromJson(Map<String, dynamic> json) {
    return Lesson(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      content: json['content'] as String?,
      summary: json['summary'] as String?,
      lessonType: LessonType.fromString(json['lesson_type'] as String?),
      classId: (json['class_id'] as num?)?.toInt(),
      className: json['class_name'] as String?,
      subjectId: (json['subject_id'] as num?)?.toInt(),
      subjectName: json['subject_name'] as String?,
      gradeLevel: json['grade_level'] as String?,
      authorId: (json['author_id'] as num?)?.toInt(),
      authorName: json['author_name'] as String?,
      authorAvatar: json['author_avatar'] as String?,
      isPublished: json['is_published'] as bool? ?? false,
      coverImageUrl: json['cover_image_url'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
    );
  }
}
