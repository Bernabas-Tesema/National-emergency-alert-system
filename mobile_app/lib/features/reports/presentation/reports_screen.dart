import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/format/time_format.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/mock_sos.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/sos_status_badge.dart';
import '../../../shared/widgets/state_views.dart';
import '../../sos/application/sos_providers.dart';
import '../../sos/domain/sos_report.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reports = ref.watch(sosReportsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('My reports'),
        actions: [
          // Debug builds with the mock API only.
          if (AppConfig.useMock && kDebugMode)
            PopupMenuButton<String>(
              tooltip: 'Test tools',
              icon: const Icon(Icons.bug_report_outlined),
              onSelected: (value) {
                if (value == 'advance') mockSosAdvance();
                if (value == 'reset') mockSosReset();
                ref.invalidate(sosReportsProvider);
              },
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: 'advance',
                  child: Text('Simulate: dispatcher update'),
                ),
                PopupMenuItem(
                  value: 'reset',
                  child: Text('Reset test reports'),
                ),
              ],
            ),
        ],
      ),
      body: reports.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          message:
              e is ApiException ? e.message : 'Could not load your reports.',
          onRetry: () => ref.invalidate(sosReportsProvider),
        ),
        data: (list) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(sosReportsProvider);
            await ref.read(sosReportsProvider.future);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              if (list.isEmpty)
                const EmptyView(
                  icon: Icons.confirmation_number_outlined,
                  message: 'Reports you send will appear here.',
                )
              else
                for (final r in list)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _ReportCard(
                      report: r,
                      onTap: () => context.push('/reports/${r.id}'),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.report, required this.onTap});

  final SosReport report;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      button: true,
      onTap: onTap,
      excludeSemantics: true,
      label: '${report.category.label} report. '
          'Status: ${report.status.label}. ${timeAgo(report.createdAt)}.',
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(report.category.icon, color: AppColors.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(report.category.label,
                          style: const TextStyle(
                              fontSize: 17, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(report.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textMuted, height: 1.4)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          SosStatusBadge(status: report.status),
                          Text(timeAgo(report.createdAt),
                              style: const TextStyle(
                                  color: AppColors.textMuted, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}