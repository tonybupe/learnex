class ClassModel {
  const ClassModel({
    required this.id,
    required this.name,
    this.description,
    this.gradeLevel,
    this.subjectId,
    this.subjectName,
    this.teacherId,
    this.teacherName,
    this.teacherAvatar,
    this.classCode,
    this.isPublic = true,
    this.memberCount = 0,
    this.lessonCount = 0,
    this.coverImageUrl,
    this.isEnrolled = false,
    this.createdAt,
  });

  final int id;
  final String name;
  final String? description;
  final String? gradeLevel;
  final int? subjectId;
  final String? subjectName;
  final int? teacherId;
  final String? teacherName;
  final String? teacherAvatar;
  final String? classCode;
  final bool isPublic;
  final int memberCount;
  final int lessonCount;
  final String? coverImageUrl;
  final bool isEnrolled;
  final DateTime? createdAt;

  factory ClassModel.fromJson(Map<String, dynamic> json) {
    return ClassModel(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      gradeLevel: json['grade_level'] as String?,
      subjectId: (json['subject_id'] as num?)?.toInt(),
      subjectName: json['subject_name'] as String?,
      teacherId: (json['teacher_id'] as num?)?.toInt(),
      teacherName: json['teacher_name'] as String?,
      teacherAvatar: json['teacher_avatar'] as String?,
      classCode: json['class_code'] as String?,
      isPublic: json['is_public'] as bool? ?? true,
      memberCount: (json['member_count'] as num?)?.toInt() ?? 0,
      lessonCount: (json['lesson_count'] as num?)?.toInt() ?? 0,
      coverImageUrl: json['cover_image_url'] as String?,
      isEnrolled: json['is_enrolled'] as bool? ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}
