import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/user.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/posts_api.dart';
import '../providers/feed_provider.dart';
import '../widgets/post_card.dart';
import 'composer_sheet.dart';

// ── Dashboard stats provider ──────────────────────────────────────
final homeStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return {};
  final dio = ref.watch(dioProvider);
  final endpoint = switch (user.role) {
    UserRole.admin => Endpoints.dashboardAdmin,
    UserRole.teacher => Endpoints.dashboardTeacher,
    UserRole.learner => Endpoints.dashboardLearner,
  };
  try {
    final res = await dio.get(endpoint);
    return res.data as Map<String, dynamic>;
  } catch (_) {
    return {};
  }
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final tab = ref.watch(selectedFeedTabProvider);
    final feedAsync = ref.watch(feedProvider(tab));

    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';
    final firstName = user?.fullName.split(' ').first ?? 'there';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.brand, AppColors.brandDark],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.school, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 8),
            const Text('Learnex',
                style: TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.brand,
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => const ComposerSheet(),
        ),
        child: const Icon(Icons.edit_outlined, color: Colors.white),
      ),
      body: RefreshIndicator(
        color: AppColors.brand,
        onRefresh: () async {
          ref.refresh(homeStatsProvider.future);
          ref.refresh(feedProvider(tab).future);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Greeting card
            SliverToBoxAdapter(
              child: _GreetingCard(
                greeting: greeting,
                firstName: firstName,
                user: user,
              ),
            ),

            // Quick actions
            SliverToBoxAdapter(
              child: _QuickActions(user: user),
            ),

            // Feed tabs
            SliverToBoxAdapter(
              child: _FeedTabs(
                current: tab,
                onChanged: (FeedTab t) =>
                    ref.read(selectedFeedTabProvider.notifier).state = t,
              ),
            ),

            // Feed content
            feedAsync.when(
              data: (posts) {
                if (posts.isEmpty) {
                  return const SliverFillRemaining(
                    child: EmptyView(
                      title: 'Your feed is empty',
                      subtitle:
                          'Join classes, follow teachers or be the first to post!',
                      icon: Icons.dynamic_feed_outlined,
                    ),
                  );
                }
                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => PostCard(post: posts[i]),
                    childCount: posts.length,
                  ),
                );
              },
              error: (e, _) => SliverFillRemaining(
                child: ErrorView(
                  message: 'Could not load feed',
                  onRetry: () => ref.refresh(feedProvider(tab).future),
                ),
              ),
              loading: () => const SliverFillRemaining(child: LoadingView()),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }
}

// ── Greeting Card ─────────────────────────────────────────────────
class _GreetingCard extends ConsumerWidget {
  const _GreetingCard({
    required this.greeting,
    required this.firstName,
    required this.user,
  });

  final String greeting;
  final String firstName;
  final User? user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(homeStatsProvider);
    final isTeacher = user?.isTeacher ?? false;
    final isAdmin = user?.role == UserRole.admin;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.brand.withValues(alpha: 0.12),
            AppColors.brand.withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.brand.withValues(alpha: 0.15),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$greeting, $firstName!',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.brand,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "What's happening in your classes",
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _todayDate(),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey,
                          ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.brand.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.brand.withValues(alpha: 0.2),
                  ),
                ),
                child: Text(
                  user?.role.label ?? '',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.brand,
                  ),
                ),
              ),
            ],
          ),

          // Stats
          statsAsync.when(
            data: (stats) {
              if (stats.isEmpty) return const SizedBox.shrink();
              final items = isAdmin
                  ? [
                      (
                        'Users',
                        '${stats['total_users'] ?? 0}',
                        AppColors.danger
                      ),
                      (
                        'Classes',
                        '${stats['total_classes'] ?? 0}',
                        AppColors.brand
                      ),
                      (
                        'Lessons',
                        '${stats['total_lessons'] ?? 0}',
                        const Color(0xFF38BDF8)
                      ),
                    ]
                  : isTeacher
                      ? [
                          (
                            'Classes',
                            '${stats['classes_count'] ?? 0}',
                            AppColors.brand
                          ),
                          (
                            'Learners',
                            '${stats['total_learners'] ?? 0}',
                            const Color(0xFF38BDF8)
                          ),
                          (
                            'Lessons',
                            '${stats['lessons_count'] ?? 0}',
                            AppColors.accent
                          ),
                        ]
                      : [
                          (
                            'Enrolled',
                            '${stats['enrolled_classes_count'] ?? 0}',
                            AppColors.brand
                          ),
                          (
                            'Lessons',
                            '${stats['lesson_count'] ?? 0}',
                            const Color(0xFF38BDF8)
                          ),
                          (
                            'Avg Score',
                            stats['average_quiz_score'] != null
                                ? '${(stats['average_quiz_score'] as num).toStringAsFixed(0)}%'
                                : '--',
                            AppColors.accent
                          ),
                        ];

              return Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Row(
                  children: items
                      .map((item) => Expanded(
                            child: Container(
                              margin: EdgeInsets.only(
                                right: item == items.last ? 0 : 8,
                              ),
                              padding: const EdgeInsets.symmetric(
                                vertical: 10,
                                horizontal: 8,
                              ),
                              decoration: BoxDecoration(
                                color: item.$3.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: item.$3.withValues(alpha: 0.15),
                                ),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    item.$2,
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w900,
                                      color: item.$3,
                                      height: 1,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    item.$1,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: item.$3.withValues(alpha: 0.7),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ))
                      .toList(),
                ),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  String _todayDate() {
    final now = DateTime.now();
    const days = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday'
    ];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${days[now.weekday - 1]}, ${months[now.month - 1]} ${now.day}';
  }
}

// ── Quick Actions ─────────────────────────────────────────────────
class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.user});
  final User? user;

  @override
  Widget build(BuildContext context) {
    final isTeacher = user?.isTeacher ?? false;
    final isAdmin = user?.role == UserRole.admin;

    final actions = isAdmin
        ? [
            (Icons.dashboard_outlined, 'Dashboard', '/dashboard',
                AppColors.danger),
            (Icons.bar_chart_outlined, 'Analytics', '/dashboard',
                AppColors.brand),
            (Icons.class_outlined, 'Classes', '/classes',
                const Color(0xFF38BDF8)),
          ]
        : isTeacher
            ? [
                (Icons.menu_book_outlined, 'Lessons', '/lessons',
                    AppColors.brand),
                (Icons.quiz_outlined, 'Quizzes', '/quizzes',
                    const Color(0xFF38BDF8)),
                (Icons.live_tv_outlined, 'Go Live', '/live-sessions',
                    AppColors.danger),
                (Icons.dashboard_outlined, 'Dashboard', '/dashboard',
                    const Color(0xFF8B5CF6)),
              ]
        : [
            (Icons.class_outlined, 'My Classes', '/classes', AppColors.brand),
            (Icons.menu_book_outlined, 'Lessons', '/lessons',
                const Color(0xFF38BDF8)),
            (Icons.quiz_outlined, 'Quizzes', '/quizzes', AppColors.accent),
            (Icons.explore_outlined, 'Discover', '/discover',
                const Color(0xFFF59E0B)),
          ];

    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: actions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final (icon, label, path, color) = actions[i];
          return InkWell(
            onTap: () => context.push(path),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: color.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, color: color, size: 18),
                  const SizedBox(width: 7),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Feed Tabs ─────────────────────────────────────────────────────
class _FeedTabs extends StatelessWidget {
  const _FeedTabs({required this.current, required this.onChanged});
  final FeedTab current;
  final ValueChanged<FeedTab> onChanged;

  final _tabs = const [
    (FeedTab.latest, 'Latest'),
    (FeedTab.trending, 'Trending'),
    (FeedTab.popular, 'Popular'),
    (FeedTab.following, 'Following'),
    (FeedTab.classes, 'My Classes'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
            backgroundColor: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF27272A)
                : const Color(0xFFF4F4F5),
            labelStyle: TextStyle(
              color: selected ? Colors.white : null,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            visualDensity: VisualDensity.compact,
          );
        },
      ),
    );
  }
}