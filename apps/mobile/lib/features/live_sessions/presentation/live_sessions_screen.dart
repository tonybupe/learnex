import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../api/endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/misc.dart';
import '../../../shared/widgets/state_views.dart';

final liveSessionsProvider = FutureProvider<List<LiveSession>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(Endpoints.liveSessions);
  final list = res.data is List
      ? res.data as List
      : (res.data['items'] as List? ?? []);
  return list
      .map((e) => LiveSession.fromJson(e as Map<String, dynamic>))
      .toList();
});

class LiveSessionsScreen extends ConsumerWidget {
  const LiveSessionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(liveSessionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Live sessions')),
      body: async.when(
        data: (sessions) {
          if (sessions.isEmpty) {
            return const EmptyView(
              title: 'No live sessions scheduled',
              subtitle: 'Teachers will announce sessions here.',
              icon: Icons.live_tv_outlined,
            );
          }
          final live = sessions
              .where((s) => s.status == LiveSessionStatus.live)
              .toList();
          final upcoming = sessions
              .where((s) => s.status == LiveSessionStatus.scheduled)
              .toList();
          final past = sessions
              .where((s) =>
                  s.status == LiveSessionStatus.ended ||
                  s.status == LiveSessionStatus.cancelled)
              .toList();
          return RefreshIndicator(
            color: AppColors.brand,
            onRefresh: () async => ref.refresh(liveSessionsProvider.future),
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: [
                if (live.isNotEmpty) ...[
                  const _SectionHeader(label: 'Live now', accent: AppColors.danger),
                  ...live.map((s) => _SessionCard(session: s)),
                  const SizedBox(height: 12),
                ],
                if (upcoming.isNotEmpty) ...[
                  const _SectionHeader(label: 'Upcoming'),
                  ...upcoming.map((s) => _SessionCard(session: s)),
                  const SizedBox(height: 12),
                ],
                if (past.isNotEmpty) ...[
                  const _SectionHeader(label: 'Past'),
                  ...past.map((s) => _SessionCard(session: s)),
                ],
              ],
            ),
          );
        },
        error: (e, _) => ErrorView(
          message: 'Could not load live sessions',
          onRetry: () => ref.refresh(liveSessionsProvider.future),
        ),
        loading: () => const LoadingView(),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label, this.accent});
  final String label;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Row(
        children: [
          if (accent != null) ...[
            Container(
              width: 8,
              height: 8,
              decoration:
                  BoxDecoration(color: accent, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: accent,
            ),
          ),
        ],
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({required this.session});
  final LiveSession session;

  @override
  Widget build(BuildContext context) {
    final isLive = session.status == LiveSessionStatus.live;
    final isPast = session.status == LiveSessionStatus.ended ||
        session.status == LiveSessionStatus.cancelled;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: (isLive ? AppColors.danger : AppColors.brand)
                        .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isLive ? Icons.fiber_manual_record : Icons.event,
                    color: isLive ? AppColors.danger : AppColors.brand,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      if (session.scheduledAt != null)
                        Text(
                          DateFormat('EEE, MMM d · h:mm a')
                              .format(session.scheduledAt!.toLocal()),
                          style: const TextStyle(fontSize: 12),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (session.description != null) ...[
              const SizedBox(height: 10),
              Text(
                session.description!,
                style: const TextStyle(fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                if (session.hostName != null)
                  Text(
                    'Host: ${session.hostName}',
                    style: const TextStyle(fontSize: 12),
                  ),
                const Spacer(),
                if (isLive && session.joinUrl != null)
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.danger,
                    ),
                    onPressed: () =>
                        launchUrl(Uri.parse(session.joinUrl!)),
                    icon: const Icon(Icons.videocam, color: Colors.white),
                    label: const Text('Join now',
                        style: TextStyle(color: Colors.white)),
                  )
                else if (!isPast)
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.notifications_outlined, size: 16),
                    label: const Text('Remind me'),
                  )
                else if (session.recordingUrl != null)
                  OutlinedButton.icon(
                    onPressed: () =>
                        launchUrl(Uri.parse(session.recordingUrl!)),
                    icon: const Icon(Icons.play_circle_outline, size: 16),
                    label: const Text('Watch recording'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
