class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.type,
    this.routePath,
    this.isRead = false,
    this.createdAt,
  });

  final int id;
  final String title;
  final String body;
  final String? type;
  final String? routePath;
  final bool isRead;
  final DateTime? createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? json['message'] as String? ?? '',
      type: json['type'] as String?,
      routePath: json['route_path'] as String? ?? json['link'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}

enum LiveSessionStatus { scheduled, live, ended, cancelled }

class LiveSession {
  const LiveSession({
    required this.id,
    required this.title,
    this.description,
    this.classId,
    this.className,
    this.hostId,
    this.hostName,
    this.scheduledAt,
    this.startedAt,
    this.endedAt,
    this.status = LiveSessionStatus.scheduled,
    this.joinUrl,
    this.recordingUrl,
    this.attendeeCount = 0,
  });

  final int id;
  final String title;
  final String? description;
  final int? classId;
  final String? className;
  final int? hostId;
  final String? hostName;
  final DateTime? scheduledAt;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final LiveSessionStatus status;
  final String? joinUrl;
  final String? recordingUrl;
  final int attendeeCount;

  factory LiveSession.fromJson(Map<String, dynamic> json) {
    return LiveSession(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      classId: (json['class_id'] as num?)?.toInt(),
      className: json['class_name'] as String?,
      hostId: (json['host_id'] as num?)?.toInt(),
      hostName: json['host_name'] as String?,
      scheduledAt: json['scheduled_at'] != null
          ? DateTime.tryParse(json['scheduled_at'] as String)
          : null,
      startedAt: json['started_at'] != null
          ? DateTime.tryParse(json['started_at'] as String)
          : null,
      endedAt: json['ended_at'] != null
          ? DateTime.tryParse(json['ended_at'] as String)
          : null,
      status: _statusFromString(json['status'] as String?),
      joinUrl: json['join_url'] as String?,
      recordingUrl: json['recording_url'] as String?,
      attendeeCount: (json['attendee_count'] as num?)?.toInt() ?? 0,
    );
  }

  static LiveSessionStatus _statusFromString(String? value) {
    return switch ((value ?? '').toLowerCase()) {
      'live' => LiveSessionStatus.live,
      'ended' => LiveSessionStatus.ended,
      'cancelled' || 'canceled' => LiveSessionStatus.cancelled,
      _ => LiveSessionStatus.scheduled,
    };
  }
}

class Subject {
  const Subject({required this.id, required this.name, this.icon});

  final int id;
  final String name;
  final String? icon;

  factory Subject.fromJson(Map<String, dynamic> json) {
    return Subject(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? '',
      icon: json['icon'] as String?,
    );
  }
}
