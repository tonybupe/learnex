import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../feed/providers/feed_provider.dart';
import '../../feed/widgets/post_card.dart';
import '../providers/classes_provider.dart';

class ClassDetailScreen extends ConsumerStatefulWidget {
  const ClassDetailScreen({required this.classId, super.key});
  final int classId;

  @override
  ConsumerState<ClassDetailScreen> createState() => _ClassDetailScreenState();
}

class _ClassDetailScreenState extends ConsumerState<ClassDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 4, vsync: this);

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(classDetailProvider(widget.classId));

    return Scaffold(
      body: detailAsync.when(
        data: (cls) => NestedScrollView(
          headerSliverBuilder: (_, __) => [
            SliverAppBar(
              pinned: true,
              expandedHeight: 200,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(cls.name),
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppColors.brand, AppColors.brandDark],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 60, 16, 50),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (cls.description != null)
                            Text(
                              cls.description!,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _StickyTabBar(
                TabBar(
                  controller: _tab,
                  labelColor: AppColors.brand,
                  indicatorColor: AppColors.brand,
                  isScrollable: true,
                  tabs: const [
                    Tab(text: 'Feed'),
                    Tab(text: 'Lessons'),
                    Tab(text: 'Chat'),
                    Tab(text: 'Members'),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: _tab,
            children: [
              _ClassFeedTab(classId: cls.id),
              const _ComingSoonTab(label: 'Lessons'),
              const _ComingSoonTab(label: 'Class chat'),
              _MembersTab(classId: cls.id),
            ],
          ),
        ),
        error: (e, _) => Scaffold(
          appBar: AppBar(),
          body: ErrorView(
            message: 'Could not load class',
            onRetry: () => ref.refresh(classDetailProvider(widget.classId).future),
          ),
        ),
        loading: () => const Scaffold(body: LoadingView()),
      ),
    );
  }
}

class _StickyTabBar extends SliverPersistentHeaderDelegate {
  _StickyTabBar(this.tabBar);
  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(SliverPersistentHeaderDelegate oldDelegate) => false;
}

class _ClassFeedTab extends ConsumerWidget {
  const _ClassFeedTab({required this.classId});
  final int classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(classFeedProvider(classId));
    return async.when(
      data: (posts) {
        if (posts.isEmpty) {
          return const EmptyView(
            title: 'No posts in this class yet',
            icon: Icons.forum_outlined,
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: posts.length,
          itemBuilder: (_, i) => PostCard(post: posts[i]),
        );
      },
      error: (e, _) => ErrorView(
        message: 'Could not load class feed',
        onRetry: () => ref.refresh(classFeedProvider(classId).future),
      ),
      loading: () => const LoadingView(),
    );
  }
}

class _MembersTab extends ConsumerWidget {
  const _MembersTab({required this.classId});
  final int classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(classMembersProvider(classId));
    return async.when(
      data: (members) => ListView.separated(
        padding: const EdgeInsets.all(8),
        itemCount: members.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, i) {
          final m = members[i];
          return ListTile(
            leading: UserAvatar(imageUrl: m.avatarUrl, name: m.fullName),
            title: Text(m.fullName),
            subtitle: Text(m.role.label),
            trailing: m.isTeacher
                ? const Icon(Icons.verified,
                    color: AppColors.brand, size: 18)
                : null,
          );
        },
      ),
      error: (e, _) => ErrorView(message: 'Could not load members'),
      loading: () => const LoadingView(),
    );
  }
}

class _ComingSoonTab extends StatelessWidget {
  const _ComingSoonTab({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return EmptyView(
      title: '$label coming soon',
      subtitle: "We're wiring this up in the next iteration.",
      icon: Icons.construction,
    );
  }
}
