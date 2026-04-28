enum MessageStatus { sending, sent, delivered, read, failed }

class Message {
  const Message({
    required this.id,
    required this.content,
    required this.senderId,
    this.recipientId,
    this.mediaUrl,
    this.status = MessageStatus.sent,
    this.createdAt,
    this.readAt,
  });

  final int id;
  final String content;
  final int senderId;
  final int? recipientId;
  final String? mediaUrl;
  final MessageStatus status;
  final DateTime? createdAt;
  final DateTime? readAt;

  bool isMine(int currentUserId) => senderId == currentUserId;

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: (json['id'] as num).toInt(),
      content: json['content'] as String? ?? '',
      senderId: (json['sender_id'] as num).toInt(),
      recipientId: (json['recipient_id'] as num?)?.toInt(),
      mediaUrl: json['media_url'] as String?,
      status: _statusFromString(json['status'] as String?),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      readAt: json['read_at'] != null
          ? DateTime.tryParse(json['read_at'] as String)
          : null,
    );
  }

  static MessageStatus _statusFromString(String? value) {
    return switch ((value ?? '').toLowerCase()) {
      'sending' => MessageStatus.sending,
      'sent' => MessageStatus.sent,
      'delivered' => MessageStatus.delivered,
      'read' => MessageStatus.read,
      'failed' => MessageStatus.failed,
      _ => MessageStatus.sent,
    };
  }
}

class Conversation {
  const Conversation({
    required this.userId,
    required this.userName,
    this.userAvatar,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.isOnline = false,
  });

  final int userId;
  final String userName;
  final String? userAvatar;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final bool isOnline;

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      userId: (json['user_id'] as num).toInt(),
      userName: json['user_name'] as String? ?? '',
      userAvatar: json['user_avatar'] as String?,
      lastMessage: json['last_message'] as String?,
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.tryParse(json['last_message_at'] as String)
          : null,
      unreadCount: (json['unread_count'] as num?)?.toInt() ?? 0,
      isOnline: json['is_online'] as bool? ?? false,
    );
  }
}
