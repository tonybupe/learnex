import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/posts_api.dart';
import '../providers/feed_provider.dart';
import '../widgets/post_card.dart';
import 'composer_sheet.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tab = ref.watch(selectedFeedTabProvider);
    final feedAsync = ref.watch(feedProvider(tab));
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      floatingActionButton: user != null
          ? FloatingActionButton(
              backgroundColor: AppColors.brand,
              onPressed: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                useSafeArea: true,
                builder: (_) => const ComposerSheet(),
              ),
              child: const Icon(Icons.edit, color: Colors.white),
            )
          : null,
      body: Column(
        children: [
          _FeedTabs(
            current: tab,
            onChanged: (t) =>
                ref.read(selectedFeedTabProvider.notifier).state = t,
          ),
          Expanded(
            child: feedAsync.when(
              data: (posts) {
                if (posts.isEmpty) {
                  return const EmptyView(
                    title: 'Your feed is empty',
                    subtitle:
                        'Follow teachers, join classes or be the first to post.',
                    icon: Icons.dynamic_feed_outlined,
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(feedProvider(tab).future),
                  color: AppColors.brand,
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: posts.length,
                    itemBuilder: (_, i) => PostCard(post: posts[i]),
                  ),
                );
              },
              error: (e, _) => ErrorView(
                message: 'Could not load feed',
                onRetry: () => ref.refresh(feedProvider(tab).future),
              ),
              loading: () => const LoadingView(),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedTabs extends StatelessWidget {
  const _FeedTabs({required this.current, required this.onChanged});
  final FeedTab current;
  final ValueChanged<FeedTab> onChanged;

  static const _tabs = [
    (FeedTab.latest, 'Latest'),
    (FeedTab.trending, 'Trending'),
    (FeedTab.popular, 'Popular'),
    (FeedTab.following, 'Following'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final (tab, label) = _tabs[i];
          final selected = current == tab;
          return ChoiceChip(
            label: Text(label),
            selected: selected,
            onSelected: (_) => onChanged(tab),
            selectedColor: AppColors.brand,
            labelStyle: TextStyle(
              color: selected ? Colors.white : null,
              fontWeight: FontWeight.w600,
            ),
          );
        },
      ),
    );
  }
}
