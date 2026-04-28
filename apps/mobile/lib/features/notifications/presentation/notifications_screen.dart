import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/misc.dart';
import '../../../shared/widgets/state_views.dart';

final notificationsProvider =
    FutureProvider<List<AppNotification>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(Endpoints.notifications);
  final list = res.data is List
      ? res.data as List
      : (res.data['items'] as List? ?? []);
  return list
      .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
      .toList();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _markAllRead(WidgetRef ref) async {
    final dio = ref.read(dioProvider);
    try {
      await dio.post(Endpoints.notificationsReadAll);
      ref.invalidate(notificationsProvider);
    } catch (_) {}
  }

  Future<void> _markRead(WidgetRef ref, int id) async {
    final dio = ref.read(dioProvider);
    try {
      await dio.post(Endpoints.notificationRead(id));
      ref.invalidate(notificationsProvider);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () => _markAllRead(ref),
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: async.when(
        data: (items) {
          if (items.isEmpty) {
            return const EmptyView(
              title: 'All caught up',
              subtitle: "You'll see updates here.",
              icon: Icons.notifications_none,
            );
          }
          return RefreshIndicator(
            color: AppColors.brand,
            onRefresh: () async => ref.refresh(notificationsProvider.future),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final n = items[i];
                return Container(
                  color: n.isRead
                      ? null
                      : AppColors.brand.withValues(alpha: 0.04),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor:
                          AppColors.brand.withValues(alpha: 0.12),
                      child: Icon(_iconFor(n.type), color: AppColors.brand),
                    ),
                    title: Text(
                      n.title,
                      style: TextStyle(
                        fontWeight:
                            n.isRead ? FontWeight.w500 : FontWeight.w700,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(n.body),
                        if (n.createdAt != null)
                          Text(
                            timeago.format(n.createdAt!),
                            style: const TextStyle(fontSize: 11),
                          ),
                      ],
                    ),
                    trailing: n.isRead
                        ? null
                        : Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.brand,
                              shape: BoxShape.circle,
                            ),
                          ),
                    onTap: () {
                      _markRead(ref, n.id);
                      if (n.routePath != null) context.push(n.routePath!);
                    },
                  ),
                );
              },
            ),
          );
        },
        error: (e, _) => ErrorView(
          message: 'Could not load notifications',
          onRetry: () => ref.refresh(notificationsProvider.future),
        ),
        loading: () => const LoadingView(),
      ),
    );
  }

  IconData _iconFor(String? type) {
    return switch (type) {
      'message' => Icons.chat_bubble_outline,
      'comment' => Icons.comment_outlined,
      'like' => Icons.favorite_border,
      'class' => Icons.class_outlined,
      'lesson' => Icons.menu_book_outlined,
      'quiz' => Icons.quiz_outlined,
      'live' => Icons.live_tv_outlined,
      _ => Icons.notifications_none,
    };
  }
}
