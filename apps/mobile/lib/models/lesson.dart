enum LessonType {
  note,
  slide,
  video,
  live,
  assignment,
  reading;

  static LessonType fromString(String? value) {
    return LessonType.values.firstWhere(
      (t) => t.name == (value ?? '').toLowerCase(),
      orElse: () => LessonType.note,
    );
  }

  String get label => switch (this) {
        LessonType.note => 'Note',
        LessonType.slide => 'Slide',
        LessonType.video => 'Video',
        LessonType.live => 'Live',
        LessonType.assignment => 'Assignment',
        LessonType.reading => 'Reading',
      };
}

class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    this.content,
    this.description,
    this.lessonType = LessonType.note,
    this.status = 'draft',
    this.visibility = 'class',
    this.classId,
    this.className,
    this.subjectId,
    this.subjectName,
    this.teacherId,
    this.teacherName,
    this.teacherAvatar,
    this.gradeLevel,
    this.coverImageUrl,
    this.resources = const [],
    this.createdAt,
    this.updatedAt,
  });

  final int id;
  final String title;
  final String? content;
  final String? description;
  final LessonType lessonType;
  final String status;       // draft | published | archived
  final String visibility;   // class | public
  final int? classId;
  final String? className;
  final int? subjectId;
  final String? subjectName;
  final int? teacherId;
  final String? teacherName;
  final String? teacherAvatar;
  final String? gradeLevel;
  final String? coverImageUrl;
  final List<dynamic> resources;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isPublished => status == 'published';
  bool get isPublic => visibility == 'public';

  factory Lesson.fromJson(Map<String, dynamic> json) {
    // Handle teacher as nested object or flat fields
    final teacher = json['teacher'] as Map<String, dynamic>?;
    return Lesson(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      content: json['content'] as String?,
      description: json['description'] as String?,
      lessonType: LessonType.fromString(json['lesson_type'] as String?),
      status: json['status'] as String? ?? 'draft',
      visibility: json['visibility'] as String? ?? 'class',
      classId: (json['class_id'] as num?)?.toInt(),
      className: json['class_name'] as String?,
      subjectId: (json['subject_id'] as num?)?.toInt(),
      subjectName: json['subject_name'] as String?,
      teacherId: teacher != null
          ? (teacher['id'] as num?)?.toInt()
          : (json['teacher_id'] as num?)?.toInt(),
      teacherName: teacher?['full_name'] as String? ?? json['teacher_name'] as String?,
      teacherAvatar: teacher?['avatar_url'] as String? ?? json['teacher_avatar'] as String?,
      gradeLevel: json['grade_level'] as String?,
      coverImageUrl: json['cover_image_url'] as String?,
      resources: json['resources'] as List<dynamic>? ?? [],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'description': description,
        'lesson_type': lessonType.name,
        'status': status,
        'visibility': visibility,
        'class_id': classId,
        'subject_id': subjectId,
        'teacher_id': teacherId,
        'grade_level': gradeLevel,
      };
}