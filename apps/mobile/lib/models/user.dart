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
    this.phoneNumber,
    this.avatarUrl,
    this.coverUrl,
    this.bio,
    this.location,
    this.country,
    this.profession,
    this.organization,
    this.school,
    this.gradeLevel,
    this.isActive = true,
    this.isVerified = false,
    this.followersCount = 0,
    this.followingCount = 0,
    this.createdAt,
  });

  final int id;
  final String fullName;
  final String email;
  final UserRole role;
  final String? phoneNumber;
  final String? avatarUrl;
  final String? coverUrl;
  final String? bio;
  final String? location;
  final String? country;
  final String? profession;
  final String? organization;
  final String? school;
  final String? gradeLevel;
  final bool isActive;
  final bool isVerified;
  final int followersCount;
  final int followingCount;
  final DateTime? createdAt;

  bool get isTeacher => role == UserRole.teacher;
  bool get isAdmin => role == UserRole.admin;
  bool get isLearner => role == UserRole.learner;

  String get firstName => fullName.split(' ').first;

  factory User.fromJson(Map<String, dynamic> json) {
    // Profile is a nested object
    final profile = json['profile'] as Map<String, dynamic>?;

    return User(
      id: (json['id'] as num).toInt(),
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: UserRole.fromString(json['role'] as String? ?? 'learner'),
      phoneNumber: json['phone_number'] as String?,
      avatarUrl: profile?['avatar_url'] as String?,
      coverUrl: profile?['cover_url'] as String?,
      bio: profile?['bio'] as String?,
      location: profile?['location'] as String?,
      country: profile?['country'] as String?,
      profession: profile?['profession'] as String?,
      organization: profile?['organization'] as String?,
      school: json['school'] as String?,
      gradeLevel: json['grade_level'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      isVerified: json['is_verified'] as bool? ?? false,
      followersCount: (json['followers_count'] as num?)?.toInt() ?? 0,
      followingCount: (json['following_count'] as num?)?.toInt() ?? 0,
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
        'phone_number': phoneNumber,
        'is_active': isActive,
        'is_verified': isVerified,
        'followers_count': followersCount,
        'following_count': followingCount,
        if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
        'profile': {
          if (avatarUrl != null) 'avatar_url': avatarUrl,
          if (coverUrl != null) 'cover_url': coverUrl,
          if (bio != null) 'bio': bio,
          if (location != null) 'location': location,
          if (country != null) 'country': country,
          if (profession != null) 'profession': profession,
          if (organization != null) 'organization': organization,
        },
      };

  User copyWith({
    String? fullName,
    String? bio,
    String? location,
    String? avatarUrl,
  }) =>
      User(
        id: id,
        fullName: fullName ?? this.fullName,
        email: email,
        role: role,
        phoneNumber: phoneNumber,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        coverUrl: coverUrl,
        bio: bio ?? this.bio,
        location: location ?? this.location,
        country: country,
        profession: profession,
        organization: organization,
        school: school,
        gradeLevel: gradeLevel,
        isActive: isActive,
        isVerified: isVerified,
        followersCount: followersCount,
        followingCount: followingCount,
        createdAt: createdAt,
      );
}