import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/user.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';

final dashboardDataProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return {};
  final dio = ref.watch(dioProvider);
  final endpoint = switch (user.role) {
    UserRole.admin => Endpoints.dashboardAdmin,
    UserRole.teacher => Endpoints.dashboardTeacher,
    UserRole.learner => Endpoints.dashboardLearner,
  };
  final res = await dio.get(endpoint);
  return res.data as Map<String, dynamic>;
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final async = ref.watch(dashboardDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('${user?.role.label ?? ''} dashboard'),
      ),
      body: async.when(
        data: (data) => RefreshIndicator(
          color: AppColors.brand,
          onRefresh: () async => ref.refresh(dashboardDataProvider.future),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Greeting(user: user),
              const SizedBox(height: 16),
              _StatsGrid(data: data, role: user?.role ?? UserRole.learner),
              const SizedBox(height: 16),
              _EngagementChart(data: data),
              const SizedBox(height: 16),
              _RecentActivity(data: data),
            ],
          ),
        ),
        error: (e, _) => ErrorView(
          message: 'Could not load dashboard',
          onRetry: () => ref.refresh(dashboardDataProvider.future),
        ),
        loading: () => const LoadingView(),
      ),
    );
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.user});
  final User? user;

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 18
            ? 'Good afternoon'
            : 'Good evening';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.brand, AppColors.brandDark],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$greeting${user != null ? ", ${user!.fullName.split(' ').first}" : ''} 👋',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            "Here's what's happening today.",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.data, required this.role});
  final Map<String, dynamic> data;
  final UserRole role;

  @override
  Widget build(BuildContext context) {
    final stats = _statsFor(role, data);
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.6,
      children: stats
          .map((s) => _StatCard(
                label: s.label,
                value: s.value,
                icon: s.icon,
                color: s.color,
              ))
          .toList(),
    );
  }

  List<({String label, String value, IconData icon, Color color})> _statsFor(
    UserRole role,
    Map<String, dynamic> data,
  ) {
    String s(String key) => '${data[key] ?? 0}';
    return switch (role) {
      UserRole.admin => [
          (
            label: 'Total users',
            value: s('total_users'),
            icon: Icons.people_outline,
            color: AppColors.brand
          ),
          (
            label: 'Active classes',
            value: s('active_classes'),
            icon: Icons.class_outlined,
            color: AppColors.accent
          ),
          (
            label: 'Lessons',
            value: s('total_lessons'),
            icon: Icons.menu_book_outlined,
            color: AppColors.info
          ),
          (
            label: 'Quiz attempts',
            value: s('quiz_attempts'),
            icon: Icons.quiz_outlined,
            color: AppColors.warning
          ),
        ],
      UserRole.teacher => [
          (
            label: 'My classes',
            value: s('my_classes'),
            icon: Icons.class_outlined,
            color: AppColors.brand
          ),
          (
            label: 'Students',
            value: s('total_students'),
            icon: Icons.people_outline,
            color: AppColors.accent
          ),
          (
            label: 'Lessons',
            value: s('lessons_published'),
            icon: Icons.menu_book_outlined,
            color: AppColors.info
          ),
          (
            label: 'Avg. score',
            value: '${data['average_quiz_score'] ?? 0}%',
            icon: Icons.show_chart,
            color: AppColors.warning
          ),
        ],
      UserRole.learner => [
          (
            label: 'Classes joined',
            value: s('classes_joined'),
            icon: Icons.class_outlined,
            color: AppColors.brand
          ),
          (
            label: 'Lessons read',
            value: s('lessons_read'),
            icon: Icons.menu_book_outlined,
            color: AppColors.accent
          ),
          (
            label: 'Quizzes taken',
            value: s('quizzes_taken'),
            icon: Icons.quiz_outlined,
            color: AppColors.info
          ),
          (
            label: 'Streak',
            value: '${data['streak_days'] ?? 0}d',
            icon: Icons.local_fire_department_outlined,
            color: AppColors.warning
          ),
        ],
    };
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EngagementChart extends StatelessWidget {
  const _EngagementChart({required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final List<dynamic> rawSeries = (data['engagement_series'] as List?) ?? [];
    final spots = rawSeries
        .asMap()
        .entries
        .map((e) {
          final v = e.value is num ? (e.value as num).toDouble() : 0.0;
          return FlSpot(e.key.toDouble(), v);
        })
        .toList();

    if (spots.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Engagement (last 7 days)',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: LineChart(
                LineChartData(
                  gridData: const FlGridData(show: false),
                  titlesData: const FlTitlesData(show: false),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: AppColors.brand,
                      barWidth: 3,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppColors.brand.withValues(alpha: 0.15),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentActivity extends StatelessWidget {
  const _RecentActivity({required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final List<dynamic> activity = (data['recent_activity'] as List?) ?? [];
    if (activity.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Recent activity',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            ...activity.take(5).map((a) {
              final m = a as Map<String, dynamic>;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.bolt, color: AppColors.brand),
                title: Text(m['title']?.toString() ?? ''),
                subtitle: Text(m['subtitle']?.toString() ?? ''),
              );
            }),
          ],
        ),
      ),
    );
  }
}
