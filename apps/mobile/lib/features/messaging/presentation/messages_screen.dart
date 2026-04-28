import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../providers/messaging_provider.dart';

class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: async.when(
        data: (convs) {
          if (convs.isEmpty) {
            return const EmptyView(
              title: 'No conversations yet',
              subtitle: 'Start a chat from a teacher or classmate profile.',
              icon: Icons.chat_bubble_outline,
            );
          }
          return RefreshIndicator(
            color: AppColors.brand,
            onRefresh: () async => ref.refresh(conversationsProvider.future),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: convs.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, indent: 72),
              itemBuilder: (_, i) {
                final c = convs[i];
                return ListTile(
                  leading: Stack(
                    children: [
                      UserAvatar(
                          imageUrl: c.userAvatar, name: c.userName, radius: 24),
                      if (c.isOnline)
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: AppColors.accent,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color:
                                    Theme.of(context).scaffoldBackgroundColor,
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  title: Text(
                    c.userName,
                    style: TextStyle(
                      fontWeight: c.unreadCount > 0
                          ? FontWeight.w700
                          : FontWeight.w500,
                    ),
                  ),
                  subtitle: c.lastMessage != null
                      ? Text(
                          c.lastMessage!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: c.unreadCount > 0
                                ? FontWeight.w500
                                : FontWeight.w400,
                          ),
                        )
                      : null,
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (c.lastMessageAt != null)
                        Text(
                          timeago.format(c.lastMessageAt!, locale: 'en_short'),
                          style: const TextStyle(fontSize: 12),
                        ),
                      const SizedBox(height: 4),
                      if (c.unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.brand,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${c.unreadCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                  onTap: () => context.push('/messages/${c.userId}'),
                );
              },
            ),
          );
        },
        error: (e, _) => ErrorView(
          message: 'Could not load conversations',
          onRetry: () => ref.refresh(conversationsProvider.future),
        ),
        loading: () => const LoadingView(),
      ),
    );
  }
}
