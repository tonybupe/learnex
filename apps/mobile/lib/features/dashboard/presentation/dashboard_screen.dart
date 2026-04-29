import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/user.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/providers/auth_provider.dart';

// ── Providers ─────────────────────────────────────────────────────
final dashboardDataProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return {};
  final dio = ref.watch(dioProvider);
  final ep = switch (user.role) {
    UserRole.admin   => Endpoints.dashboardAdmin,
    UserRole.teacher => Endpoints.dashboardTeacher,
    UserRole.learner => Endpoints.dashboardLearner,
  };
  try {
    final res = await dio.get(ep);
    return res.data as Map<String, dynamic>;
  } catch (_) { return {}; }
});

final sessionsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/live-sessions/upcoming');
    final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
    return list.cast<Map<String, dynamic>>();
  } catch (_) { return []; }
});

final classesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/classes?mine=true');
    final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
    return list.cast<Map<String, dynamic>>();
  } catch (_) { return []; }
});

final lessonsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get('/lessons?mine=true&limit=10');
    final list = res.data is List ? res.data as List : (res.data['items'] as List? ?? []);
    return list.cast<Map<String, dynamic>>();
  } catch (_) { return []; }
});

// ── Main Screen ────────────────────────────────────────────────────
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  String _tab = 'overview';

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const Scaffold(body: LoadingView());

    return switch (user.role) {
      UserRole.teacher => _TeacherDashboard(tab: _tab, onTab: (t) => setState(() => _tab = t)),
      UserRole.learner => const _LearnerDashboard(),
      UserRole.admin   => const _AdminDashboard(),
    };
  }
}

// ── Shared Widgets ─────────────────────────────────────────────────
class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.title, required this.value, required this.icon, required this.color, this.sub});
  final String title, value;
  final IconData icon;
  final Color color;
  final String? sub;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border(left: BorderSide(color: color, width: 3)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
      ),
      child: Row(
        children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5), overflow: TextOverflow.ellipsis),
                Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color, height: 1.1)),
                if (sub != null) Text(sub!, style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 15, color: AppColors.brand),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.padding});
  final Widget child;
  final EdgeInsetsGeometry? padding;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: child,
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({required this.tabs, required this.current, required this.onTap});
  final List<(String, String)> tabs;
  final String current;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final (key, label) = tabs[i];
          final selected = current == key;
          return GestureDetector(
            onTap: () => onTap(key),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: selected ? AppColors.brand : Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: selected ? AppColors.brand : Theme.of(context).dividerColor),
                boxShadow: selected ? [BoxShadow(color: AppColors.brand.withValues(alpha: 0.25), blurRadius: 8)] : [],
              ),
              child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: selected ? Colors.white : Colors.grey)),
            ),
          );
        },
      ),
    );
  }
}

class _Ring extends StatelessWidget {
  const _Ring({required this.value, required this.label, required this.color});
  final int value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 72, height: 72,
          child: Stack(
            alignment: Alignment.center,
            children: [
              PieChart(PieChartData(
                sectionsSpace: 0,
                startDegreeOffset: 90,
                sections: [
                  PieChartSectionData(value: value.toDouble(), color: color, radius: 12, showTitle: false),
                  PieChartSectionData(value: (100 - value).toDouble(), color: Theme.of(context).dividerColor, radius: 12, showTitle: false),
                ],
              )),
              Text('$value%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: color)),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
      ],
    );
  }
}

class _ProgressRow extends StatelessWidget {
  const _ProgressRow({required this.label, required this.value, required this.max, required this.color});
  final String label;
  final int value, max;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final pct = max > 0 ? (value / max).clamp(0.0, 1.0) : 0.0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              RichText(text: TextSpan(children: [
                TextSpan(text: '$value', style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 12)),
                TextSpan(text: '/$max', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ])),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: pct,
              backgroundColor: Theme.of(context).dividerColor,
              color: color,
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.label, required this.icon, required this.color, required this.onTap});
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 34, height: 34,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 5),
            Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: color), textAlign: TextAlign.center, maxLines: 2),
          ],
        ),
      ),
    );
  }
}

// ── Teacher Dashboard ──────────────────────────────────────────────
class _TeacherDashboard extends ConsumerWidget {
  const _TeacherDashboard({required this.tab, required this.onTab});
  final String tab;
  final ValueChanged<String> onTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider)!;
    final statsAsync = ref.watch(dashboardDataProvider);
    final sessionsAsync = ref.watch(sessionsProvider);
    final lessonsAsync = ref.watch(lessonsProvider);
    final classesAsync = ref.watch(classesProvider);

    final stats = statsAsync.value ?? {};
    final totalClasses  = stats['classes_count']  as int? ?? 0;
    final totalLearners = stats['total_learners']  as int? ?? 0;
    final totalLessons  = stats['lessons_count']   as int? ?? 0;
    final totalQuizzes  = stats['total_quiz_attempts'] as int? ?? 0;
    final avgScore      = (stats['average_quiz_score'] as num?)?.round() ?? 0;
    final engagementRate = totalLearners > 0 ? (totalQuizzes / totalLearners * 100).round().clamp(0, 100) : 0;
    final publishedLessons = (lessonsAsync.value ?? []).where((l) => l['status'] == 'published').length;
    final completionRate = totalLessons > 0 ? (publishedLessons / totalLessons * 100).round() : 0;

    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Teaching Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () {
            ref.refresh(dashboardDataProvider);
            ref.refresh(sessionsProvider);
            ref.refresh(lessonsProvider);
            ref.refresh(classesProvider);
          }),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.brand,
        onRefresh: () async {
          ref.refresh(dashboardDataProvider.future);
        },
        child: ListView(
          padding: const EdgeInsets.all(0),
          children: [
            // Header banner
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [AppColors.brand.withValues(alpha: 0.12), AppColors.brand.withValues(alpha: 0.03)],
                ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.brand.withValues(alpha: 0.15)),
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
                            Row(children: [
                              const Icon(Icons.waving_hand, size: 13, color: AppColors.brand),
                              const SizedBox(width: 4),
                              Text('$greeting, ${user.firstName}!', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brand)),
                            ]),
                            const SizedBox(height: 4),
                            const Text('Teaching Dashboard', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, height: 1.1)),
                            const SizedBox(height: 2),
                            Text('$totalClasses classes · $totalLearners learners · $totalLessons lessons', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => context.push('/lessons'),
                        icon: const Icon(Icons.add, size: 14),
                        label: const Text('New Lesson', style: TextStyle(fontSize: 12)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brand, foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // KPI Grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: GridView.count(
                crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.0,
                children: [
                  _KpiCard(title: 'MY CLASSES', value: '$totalClasses', icon: Icons.menu_book_outlined, color: AppColors.brand, sub: '$totalLearners learners'),
                  _KpiCard(title: 'LEARNERS', value: '$totalLearners', icon: Icons.people_outline, color: const Color(0xFF38BDF8), sub: '$totalClasses classes'),
                  _KpiCard(title: 'LESSONS', value: '$totalLessons', icon: Icons.school_outlined, color: AppColors.accent, sub: '$publishedLessons published'),
                  _KpiCard(title: 'QUIZ ATTEMPTS', value: '$totalQuizzes', icon: Icons.quiz_outlined, color: AppColors.warning, sub: 'avg score $avgScore%'),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Quick Actions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(children: [
                      Icon(Icons.bolt, size: 14, color: AppColors.brand),
                      SizedBox(width: 4),
                      Text('Quick Actions', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                    ]),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 1.1,
                      children: [
                        _QuickAction(label: 'New Lesson', icon: Icons.add_circle_outline, color: AppColors.brand, onTap: () => context.push('/lessons')),
                        _QuickAction(label: 'New Quiz', icon: Icons.quiz_outlined, color: const Color(0xFF38BDF8), onTap: () => context.push('/quizzes')),
                        _QuickAction(label: 'My Classes', icon: Icons.class_outlined, color: AppColors.accent, onTap: () => context.push('/classes')),
                        _QuickAction(label: 'Go Live', icon: Icons.live_tv_outlined, color: AppColors.danger, onTap: () => context.push('/live-sessions')),
                        _QuickAction(label: 'Analytics', icon: Icons.bar_chart_outlined, color: const Color(0xFF8B5CF6), onTap: () => context.push('/dashboard')),
                        _QuickAction(label: 'Discover', icon: Icons.explore_outlined, color: const Color(0xFFF59E0B), onTap: () => context.push('/discover')),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Tabs
            _TabBar(
              current: tab,
              onTap: onTab,
              tabs: const [
                ('overview', '📊 Overview'),
                ('engagement', '❤️ Engagement'),
                ('content', '📚 Content'),
              ],
            ),
            const SizedBox(height: 14),

            // Tab content
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: switch(tab) {
                'overview'   => _TeacherOverviewTab(engagementRate: engagementRate, completionRate: completionRate, avgScore: avgScore, retentionRate: 65, sessions: sessionsAsync.value ?? []),
                'engagement' => _TeacherEngagementTab(engagementRate: engagementRate, completionRate: completionRate, avgScore: avgScore, totalQuizzes: totalQuizzes, totalLearners: totalLearners, publishedLessons: publishedLessons, totalLessons: totalLessons, totalClasses: totalClasses, classes: classesAsync.value ?? []),
                'content'    => _TeacherContentTab(totalLessons: totalLessons, publishedLessons: publishedLessons, totalClasses: totalClasses, totalQuizzes: totalQuizzes, lessons: lessonsAsync.value ?? []),
                _            => const SizedBox.shrink(),
              },
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

class _TeacherOverviewTab extends StatelessWidget {
  const _TeacherOverviewTab({required this.engagementRate, required this.completionRate, required this.avgScore, required this.retentionRate, required this.sessions});
  final int engagementRate, completionRate, avgScore, retentionRate;
  final List<Map<String, dynamic>> sessions;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Metric rings
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(icon: Icons.emoji_events_outlined, label: 'Key Metrics'),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _Ring(value: engagementRate, label: 'Quiz Rate', color: AppColors.brand),
              _Ring(value: completionRate, label: 'Published', color: AppColors.accent),
              _Ring(value: avgScore.clamp(0, 100), label: 'Avg Score', color: const Color(0xFF38BDF8)),
              _Ring(value: retentionRate.clamp(0, 100), label: 'Learner Ratio', color: AppColors.warning),
            ],
          ),
        ],
      )),
      const SizedBox(height: 12),

      // Upcoming sessions
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const _SectionTitle(icon: Icons.calendar_today_outlined, label: 'Upcoming Sessions'),
              TextButton(onPressed: () => Navigator.of(context).pushNamed('/live-sessions'), child: const Text('View all', style: TextStyle(fontSize: 11))),
            ],
          ),
          if (sessions.isEmpty)
            Center(child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Column(children: [
                const Icon(Icons.live_tv_outlined, size: 32, color: Colors.grey),
                const SizedBox(height: 8),
                const Text('No upcoming sessions', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.brand, foregroundColor: Colors.white, elevation: 0),
                  child: const Text('Schedule Session', style: TextStyle(fontSize: 12)),
                ),
              ]),
            ))
          else
            ...sessions.take(4).map((s) => ListTile(
              dense: true,
              leading: Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle)),
              title: Text(s['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              subtitle: Text(s['session_type'] as String? ?? '', style: const TextStyle(fontSize: 11)),
              trailing: const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
            )),
        ],
      )),
    ]);
  }
}

class _TeacherEngagementTab extends StatelessWidget {
  const _TeacherEngagementTab({required this.engagementRate, required this.completionRate, required this.avgScore, required this.totalQuizzes, required this.totalLearners, required this.publishedLessons, required this.totalLessons, required this.totalClasses, required this.classes});
  final int engagementRate, completionRate, avgScore, totalQuizzes, totalLearners, publishedLessons, totalLessons, totalClasses;
  final List<Map<String, dynamic>> classes;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      GridView.count(
        crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.3,
        children: [
          _MetricBox(icon: '❤️', label: 'Quiz Attempt Rate', value: engagementRate, color: AppColors.brand, desc: '$totalQuizzes attempts by $totalLearners learners'),
          _MetricBox(icon: '✅', label: 'Published Rate', value: completionRate, color: AppColors.accent, desc: '$publishedLessons of $totalLessons lessons live'),
          _MetricBox(icon: '🎯', label: 'Avg Quiz Score', value: avgScore.clamp(0, 100), color: const Color(0xFF38BDF8), desc: 'Across $totalQuizzes attempts'),
          _MetricBox(icon: '🔁', label: 'Learner Ratio', value: totalClasses > 0 ? (totalLearners / (totalClasses * 10) * 100).round().clamp(0, 100) : 0, color: AppColors.warning, desc: '$totalLearners across $totalClasses classes'),
        ],
      ),
      const SizedBox(height: 12),
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(icon: Icons.school_outlined, label: 'Class Breakdown'),
          const SizedBox(height: 12),
          if (classes.isEmpty)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('No classes yet', style: TextStyle(color: Colors.grey))))
          else
            ...classes.take(5).map((cls) => ListTile(
              dense: true,
              title: Text(cls['name'] as String? ?? cls['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              subtitle: Text('${cls['enrolled_count'] ?? 0} learners · ${cls['lesson_count'] ?? 0} lessons', style: const TextStyle(fontSize: 11)),
              trailing: const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
              onTap: () {},
            )),
        ],
      )),
    ]);
  }
}

class _MetricBox extends StatelessWidget {
  const _MetricBox({required this.icon, required this.label, required this.value, required this.color, required this.desc});
  final String icon, label, desc;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(icon, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 4),
          Text('$value%', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color)),
          Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(desc, style: const TextStyle(fontSize: 9, color: Colors.grey), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 6),
          ClipRRect(borderRadius: BorderRadius.circular(999), child: LinearProgressIndicator(value: value / 100, backgroundColor: Colors.grey.shade200, color: color, minHeight: 3)),
        ],
      ),
    );
  }
}

class _TeacherContentTab extends StatelessWidget {
  const _TeacherContentTab({required this.totalLessons, required this.publishedLessons, required this.totalClasses, required this.totalQuizzes, required this.lessons});
  final int totalLessons, publishedLessons, totalClasses, totalQuizzes;
  final List<Map<String, dynamic>> lessons;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(icon: Icons.menu_book_outlined, label: 'Recent Lessons'),
          const SizedBox(height: 10),
          if (lessons.isEmpty)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('No lessons yet', style: TextStyle(color: Colors.grey))))
          else
            ...lessons.take(6).map((l) => ListTile(
              dense: true,
              leading: Container(
                width: 34, height: 34,
                decoration: BoxDecoration(
                  color: l['status'] == 'published' ? AppColors.accent.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(l['status'] == 'published' ? Icons.check_circle_outline : Icons.pending_outlined, color: l['status'] == 'published' ? AppColors.accent : Colors.grey, size: 18),
              ),
              title: Text(l['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13), overflow: TextOverflow.ellipsis),
              subtitle: Text('${l['lesson_type'] ?? ''} · ${l['status'] ?? ''}', style: const TextStyle(fontSize: 11)),
            )),
        ],
      )),
      const SizedBox(height: 12),
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(icon: Icons.psychology_outlined, label: 'Content Summary'),
          const SizedBox(height: 12),
          _ProgressRow(label: 'Total Lessons', value: totalLessons, max: 30, color: AppColors.brand),
          _ProgressRow(label: 'Published', value: publishedLessons, max: totalLessons > 0 ? totalLessons : 1, color: AppColors.accent),
          _ProgressRow(label: 'Total Classes', value: totalClasses, max: 10, color: const Color(0xFF38BDF8)),
          _ProgressRow(label: 'Quiz Attempts', value: totalQuizzes, max: 100, color: AppColors.warning),
        ],
      )),
    ]);
  }
}

// ── Learner Dashboard ──────────────────────────────────────────────
class _LearnerDashboard extends ConsumerWidget {
  const _LearnerDashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider)!;
    final statsAsync = ref.watch(dashboardDataProvider);
    final sessionsAsync = ref.watch(sessionsProvider);
    final stats = statsAsync.value ?? {};

    final enrolled   = stats['enrolled_classes_count'] as int? ?? 0;
    final lessons    = stats['lesson_count']            as int? ?? 0;
    final quizzes    = stats['quiz_attempts_count']     as int? ?? 0;
    final avgScore   = (stats['average_quiz_score'] as num?)?.round() ?? 0;

    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return Scaffold(
      appBar: AppBar(title: const Text('My Dashboard')),
      body: RefreshIndicator(
        color: AppColors.brand,
        onRefresh: () => ref.refresh(dashboardDataProvider.future),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [const Color(0xFF38BDF8).withValues(alpha: 0.12), const Color(0xFF38BDF8).withValues(alpha: 0.03)],
                ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('$greeting, ${user.firstName}!', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF38BDF8))),
                      const SizedBox(height: 4),
                      const Text('Stay on top of your learning', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                    ],
                  )),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: const Color(0xFF38BDF8).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                    child: const Text('Learner', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF38BDF8))),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // KPIs
            GridView.count(
              crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.0,
              children: [
                _KpiCard(title: 'ENROLLED CLASSES', value: '$enrolled', icon: Icons.school_outlined, color: AppColors.brand),
                _KpiCard(title: 'LESSONS', value: '$lessons', icon: Icons.menu_book_outlined, color: const Color(0xFF38BDF8)),
                _KpiCard(title: 'QUIZZES TAKEN', value: '$quizzes', icon: Icons.quiz_outlined, color: AppColors.accent),
                _KpiCard(title: 'AVG SCORE', value: '$avgScore%', icon: Icons.star_outline, color: AppColors.warning),
              ],
            ),
            const SizedBox(height: 14),

            // Quick actions
            _Card(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [
                  Icon(Icons.bolt, size: 14, color: Color(0xFF38BDF8)),
                  SizedBox(width: 4),
                  Text('Quick Actions', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                ]),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 1.1,
                  children: [
                    _QuickAction(label: 'My Classes', icon: Icons.class_outlined, color: AppColors.brand, onTap: () => context.push('/classes')),
                    _QuickAction(label: 'Lessons', icon: Icons.menu_book_outlined, color: const Color(0xFF38BDF8), onTap: () => context.push('/lessons')),
                    _QuickAction(label: 'Quizzes', icon: Icons.quiz_outlined, color: AppColors.accent, onTap: () => context.push('/quizzes')),
                    _QuickAction(label: 'Live', icon: Icons.live_tv_outlined, color: AppColors.warning, onTap: () => context.push('/live-sessions')),
                    _QuickAction(label: 'Discover', icon: Icons.explore_outlined, color: const Color(0xFF8B5CF6), onTap: () => context.push('/discover')),
                    _QuickAction(label: 'Messages', icon: Icons.chat_bubble_outline, color: const Color(0xFF06B6D4), onTap: () => context.push('/messages')),
                  ],
                ),
              ],
            )),
            const SizedBox(height: 14),

            // Upcoming sessions
            _Card(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const _SectionTitle(icon: Icons.calendar_today_outlined, label: 'Upcoming Sessions'),
                    TextButton(onPressed: () => context.push('/live-sessions'), child: const Text('View all', style: TextStyle(fontSize: 11))),
                  ],
                ),
                sessionsAsync.when(
                  data: (sessions) => sessions.isEmpty
                      ? const Center(child: Padding(padding: EdgeInsets.all(16), child: Text('No upcoming sessions', style: TextStyle(color: Colors.grey))))
                      : Column(children: sessions.take(3).map((s) => ListTile(
                          dense: true,
                          leading: const Icon(Icons.fiber_manual_record, color: AppColors.danger, size: 10),
                          title: Text(s['title'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          subtitle: Text(s['teacher']?['full_name'] as String? ?? '', style: const TextStyle(fontSize: 11)),
                        )).toList()),
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ],
            )),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

// ── Admin Dashboard ────────────────────────────────────────────────
class _AdminDashboard extends ConsumerStatefulWidget {
  const _AdminDashboard();
  @override
  ConsumerState<_AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends ConsumerState<_AdminDashboard> {
  String _tab = 'overview';

  @override
  Widget build(BuildContext context) {
    final statsAsync = ref.watch(dashboardDataProvider);
    final stats = statsAsync.value ?? {};

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          Container(
            width: 30, height: 30,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.danger, AppColors.brand]),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.shield_outlined, color: Colors.white, size: 16),
          ),
          const SizedBox(width: 8),
          const Text('Admin Dashboard'),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(dashboardDataProvider)),
        ],
      ),
      body: Column(
        children: [
          // Tabs
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: _TabBar(
              current: _tab,
              onTap: (t) => setState(() => _tab = t),
              tabs: const [
                ('overview', '📊 Overview'),
                ('users', '👥 Users'),
                ('content', '📚 Content'),
                ('system', '⚙️ System'),
              ],
            ),
          ),

          Expanded(
            child: RefreshIndicator(
              color: AppColors.brand,
              onRefresh: () => ref.refresh(dashboardDataProvider.future),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_tab == 'overview') _AdminOverviewTab(stats: stats),
                  if (_tab == 'users')    _AdminUsersTab(stats: stats),
                  if (_tab == 'content')  _AdminContentTab(stats: stats),
                  if (_tab == 'system')   _AdminSystemTab(stats: stats),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AdminOverviewTab extends StatelessWidget {
  const _AdminOverviewTab({required this.stats});
  final Map<String, dynamic> stats;

  @override
  Widget build(BuildContext context) {
    final statCards = [
      ('Total Users',    '${stats['total_users'] ?? 0}',          Icons.people_outline,    AppColors.brand,           '${stats['total_teachers'] ?? 0} teachers · ${stats['total_learners'] ?? 0} learners'),
      ('Classes',        '${stats['total_classes'] ?? 0}',        Icons.class_outlined,    const Color(0xFF38BDF8),   '${stats['total_subjects'] ?? 0} subjects'),
      ('Content',        '${(stats['total_lessons'] ?? 0) + (stats['total_quizzes'] ?? 0)}', Icons.description_outlined, AppColors.accent, '${stats['total_lessons'] ?? 0} lessons · ${stats['total_quizzes'] ?? 0} quizzes'),
      ('Posts',          '${stats['total_posts'] ?? 0}',          Icons.chat_bubble_outline, AppColors.warning,       'Platform discussions'),
      ('Live Sessions',  '${stats['total_live_sessions'] ?? 0}',  Icons.live_tv_outlined,  const Color(0xFF8B5CF6),   'Scheduled & completed'),
      ('Open Reports',   '${stats['open_reports'] ?? 0}',         Icons.warning_outlined,  AppColors.danger,          '${stats['total_reports'] ?? 0} total'),
    ];

    return Column(children: [
      GridView.count(
        crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.9,
        children: statCards.map((s) => _KpiCard(title: s.$1.toUpperCase(), value: s.$2, icon: s.$3, color: s.$4, sub: s.$5)).toList(),
      ),
      const SizedBox(height: 14),
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.bolt, size: 14, color: AppColors.danger),
            SizedBox(width: 4),
            Text('Quick Actions', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 4, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 0.9,
            children: [
              _QuickAction(label: 'Users', icon: Icons.people_outline, color: AppColors.brand, onTap: () {}),
              _QuickAction(label: 'Classes', icon: Icons.class_outlined, color: const Color(0xFF38BDF8), onTap: () => context.push('/classes')),
              _QuickAction(label: 'Analytics', icon: Icons.bar_chart, color: AppColors.accent, onTap: () {}),
              _QuickAction(label: 'Live', icon: Icons.live_tv_outlined, color: const Color(0xFF06B6D4), onTap: () => context.push('/live-sessions')),
            ],
          ),
        ],
      )),
    ]);
  }
}

class _AdminUsersTab extends StatelessWidget {
  const _AdminUsersTab({required this.stats});
  final Map<String, dynamic> stats;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      GridView.count(
        crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.5,
        children: [
          _StatBox(label: 'Total Users', value: '${stats['total_users'] ?? 0}', color: AppColors.brand),
          _StatBox(label: 'Teachers', value: '${stats['total_teachers'] ?? 0}', color: const Color(0xFF38BDF8)),
          _StatBox(label: 'Learners', value: '${stats['total_learners'] ?? 0}', color: AppColors.accent),
        ],
      ),
      const SizedBox(height: 12),
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(icon: Icons.people_outline, label: 'User Overview'),
          const SizedBox(height: 12),
          ...[
            ('Admins',    stats['total_admins']   ?? 0, AppColors.danger),
            ('Teachers',  stats['total_teachers'] ?? 0, AppColors.brand),
            ('Learners',  stats['total_learners'] ?? 0, const Color(0xFF38BDF8)),
          ].map((row) => _ProgressRow(label: row.$1, value: row.$2 as int, max: (stats['total_users'] as int? ?? 1), color: row.$3 as Color)),
        ],
      )),
    ]);
  }
}

class _AdminContentTab extends StatelessWidget {
  const _AdminContentTab({required this.stats});
  final Map<String, dynamic> stats;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      GridView.count(
        crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.0,
        children: [
          _KpiCard(title: 'LESSONS', value: '${stats['total_lessons'] ?? 0}', icon: Icons.menu_book_outlined, color: const Color(0xFF38BDF8)),
          _KpiCard(title: 'QUIZZES', value: '${stats['total_quizzes'] ?? 0}', icon: Icons.quiz_outlined, color: AppColors.brand),
          _KpiCard(title: 'LIVE SESSIONS', value: '${stats['total_live_sessions'] ?? 0}', icon: Icons.live_tv_outlined, color: AppColors.accent),
          _KpiCard(title: 'MEDIA FILES', value: '${stats['total_media_files'] ?? 0}', icon: Icons.attach_file_outlined, color: AppColors.warning),
        ],
      ),
    ]);
  }
}

class _AdminSystemTab extends StatelessWidget {
  const _AdminSystemTab({required this.stats});
  final Map<String, dynamic> stats;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(icon: Icons.info_outline, label: 'System Information'),
          const SizedBox(height: 12),
          ...[
            ('Platform',    'Learnex LMS'),
            ('Version',     '1.0.0'),
            ('Backend',     'FastAPI Python 3.12'),
            ('Frontend',    'React 18 + TypeScript'),
            ('Database',    'PostgreSQL (Supabase)'),
            ('Mobile',      'Flutter 3.41'),
            ('API',         'api.learn-ex.online'),
          ].map((row) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(row.$1, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w600, fontSize: 13)),
                Text(row.$2, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ),
          )),
        ],
      )),
      const SizedBox(height: 12),
      _Card(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(icon: Icons.monitor_heart_outlined, label: 'Platform Health'),
          const SizedBox(height: 12),
          ...[
            ('API Status',    '✅ Online',    AppColors.accent),
            ('Database',      '✅ Connected', AppColors.accent),
            ('WebSocket',     '✅ Active',    AppColors.accent),
            ('File Storage',  '✅ Available', AppColors.accent),
            ('Open Reports',  (stats['open_reports'] ?? 0) > 0 ? '⚠️ ${stats['open_reports']} pending' : '✅ Clear', (stats['open_reports'] ?? 0) > 0 ? AppColors.danger : AppColors.accent),
          ].map((row) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(row.$1, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w600, fontSize: 13)),
                Text(row.$2, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: row.$3 as Color)),
              ],
            ),
          )),
        ],
      )),
    ]);
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.label, required this.value, required this.color});
  final String label, value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border(top: BorderSide(color: color, width: 3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color)),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }
}