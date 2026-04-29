class ClassModel {
  const ClassModel({
    required this.id,
    required this.title,
    this.description,
    this.gradeLevel,
    this.subjectId,
    this.subjectName,
    this.teacherId,
    this.teacherName,
    this.teacherAvatar,
    this.classCode,
    this.visibility = 'public',
    this.status = 'active',
    this.memberCount = 0,
    this.lessonCount = 0,
    this.coverImageUrl,
    this.isMember,
    this.isOwner,
    this.createdAt,
  });

  final int id;
  final String title;
  final String? description;
  final String? gradeLevel;
  final int? subjectId;
  final String? subjectName;
  final int? teacherId;
  final String? teacherName;
  final String? teacherAvatar;
  final String? classCode;
  final String visibility;
  final String status;
  final int memberCount;
  final int lessonCount;
  final String? coverImageUrl;
  final bool? isMember;
  final bool? isOwner;
  final DateTime? createdAt;

  bool get isPublic => visibility == 'public';
  bool get isActive => status == 'active';

  factory ClassModel.fromJson(Map<String, dynamic> json) {
    final teacher = json['teacher'] as Map<String, dynamic>?;
    final subject = json['subject'] as Map<String, dynamic>?;
    return ClassModel(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? json['name'] as String? ?? '',
      description: json['description'] as String?,
      gradeLevel: json['grade_level'] as String?,
      subjectId: (json['subject_id'] as num?)?.toInt(),
      subjectName: subject?['name'] as String? ?? json['subject_name'] as String?,
      teacherId: teacher != null
          ? (teacher['id'] as num?)?.toInt()
          : (json['teacher_id'] as num?)?.toInt(),
      teacherName: teacher?['full_name'] as String? ?? json['teacher_name'] as String?,
      teacherAvatar: teacher?['avatar_url'] as String? ?? json['teacher_avatar'] as String?,
      classCode: json['class_code'] as String?,
      visibility: json['visibility'] as String? ?? (json['is_public'] == true ? 'public' : 'private'),
      status: json['status'] as String? ?? 'active',
      memberCount: (json['member_count'] as num?)?.toInt() ??
          (json['enrolled_count'] as num?)?.toInt() ?? 0,
      lessonCount: (json['lesson_count'] as num?)?.toInt() ?? 0,
      coverImageUrl: json['cover_image_url'] as String?,
      isMember: json['is_member'] as bool? ?? json['is_enrolled'] as bool?,
      isOwner: json['is_owner'] as bool?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'visibility': visibility,
        'class_code': classCode,
      };
}