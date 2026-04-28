class Post {
  const Post({
    required this.id,
    required this.content,
    this.authorId,
    this.authorName,
    this.authorAvatar,
    this.authorRole,
    this.mediaUrls = const [],
    this.likeCount = 0,
    this.commentCount = 0,
    this.isLiked = false,
    this.classId,
    this.className,
    this.createdAt,
  });

  final int id;
  final String content;
  final int? authorId;
  final String? authorName;
  final String? authorAvatar;
  final String? authorRole;
  final List<String> mediaUrls;
  final int likeCount;
  final int commentCount;
  final bool isLiked;
  final int? classId;
  final String? className;
  final DateTime? createdAt;

  Post copyWith({
    int? likeCount,
    int? commentCount,
    bool? isLiked,
  }) {
    return Post(
      id: id,
      content: content,
      authorId: authorId,
      authorName: authorName,
      authorAvatar: authorAvatar,
      authorRole: authorRole,
      mediaUrls: mediaUrls,
      likeCount: likeCount ?? this.likeCount,
      commentCount: commentCount ?? this.commentCount,
      isLiked: isLiked ?? this.isLiked,
      classId: classId,
      className: className,
      createdAt: createdAt,
    );
  }

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: (json['id'] as num).toInt(),
      content: json['content'] as String? ?? '',
      authorId: (json['author_id'] as num?)?.toInt(),
      authorName: json['author_name'] as String?,
      authorAvatar: json['author_avatar'] as String?,
      authorRole: json['author_role'] as String?,
      mediaUrls: (json['media_urls'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      likeCount: (json['like_count'] as num?)?.toInt() ?? 0,
      commentCount: (json['comment_count'] as num?)?.toInt() ?? 0,
      isLiked: json['is_liked'] as bool? ?? false,
      classId: (json['class_id'] as num?)?.toInt(),
      className: json['class_name'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}

class Comment {
  const Comment({
    required this.id,
    required this.content,
    this.authorId,
    this.authorName,
    this.authorAvatar,
    this.createdAt,
  });

  final int id;
  final String content;
  final int? authorId;
  final String? authorName;
  final String? authorAvatar;
  final DateTime? createdAt;

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: (json['id'] as num).toInt(),
      content: json['content'] as String? ?? '',
      authorId: (json['author_id'] as num?)?.toInt(),
      authorName: json['author_name'] as String?,
      authorAvatar: json['author_avatar'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}
