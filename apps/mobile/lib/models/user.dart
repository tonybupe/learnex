enum UserRole {
  admin,
  teacher,
  learner;

  static UserRole fromString(String value) {
    return UserRole.values.firstWhere(
      (r) => r.name == value.toLowerCase(),
      orElse: () => UserRole.learner,
    );
  }

  String get label => switch (this) {
        UserRole.admin => 'Admin',
        UserRole.teacher => 'Teacher',
        UserRole.learner => 'Learner',
      };
}

class User {
  const User({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    this.avatarUrl,
    this.bio,
    this.school,
    this.gradeLevel,
    this.createdAt,
  });

  final int id;
  final String fullName;
  final String email;
  final UserRole role;
  final String? avatarUrl;
  final String? bio;
  final String? school;
  final String? gradeLevel;
  final DateTime? createdAt;

  bool get isTeacher => role == UserRole.teacher || role == UserRole.admin;
  bool get isAdmin => role == UserRole.admin;
  bool get isLearner => role == UserRole.learner;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] as num).toInt(),
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: UserRole.fromString(json['role'] as String? ?? 'learner'),
      avatarUrl: json['avatar_url'] as String?,
      bio: json['bio'] as String?,
      school: json['school'] as String?,
      gradeLevel: json['grade_level'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'full_name': fullName,
        'email': email,
        'role': role.name,
        'avatar_url': avatarUrl,
        'bio': bio,
        'school': school,
        'grade_level': gradeLevel,
        'created_at': createdAt?.toIso8601String(),
      };
}
