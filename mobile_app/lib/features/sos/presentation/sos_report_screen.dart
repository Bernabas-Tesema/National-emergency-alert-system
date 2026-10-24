import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/time_format.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/sos_status_badge.dart';
import '../../../shared/widgets/state_views.dart';
import '../application/sos_providers.dart';
import '../domain/sos_report.dart';

class SosReportScreen extends ConsumerWidget {
  const SosReportScreen({super.key, required this.reportId});

  final String reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reports = ref.watch(sosReportsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Report details')),
      body: reports.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          message: e is ApiException ? e.message : 'Could not load this report.',
          onRetry: () => ref.invalidate(sosReportsProvider),
        ),
        data: (list) {
          final matches = list.where((r) => r.id == reportId);
          if (matches.isEmpty) {
            return const EmptyView(
                icon: Icons.search_off, message: 'This report was not found.');
          }
          return _Body(report: matches.first);
        },
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.report});

  final SosReport report;

  @override
  Widget build(BuildContext context) {
    final loc = report.location;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Icon(report.category.icon, size: 32, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Semantics(
                header: true,
                child: Text(report.category.label,
                    style: const TextStyle(
                        fontSize: 24, fontWeight: FontWeight.w800)),
              ),
            ),
            SosStatusBadge(status: report.status),
          ],
        ),
        const SizedBox(height: 16),
        _Block(title: 'Progress', child: _Steps(current: report.status)),
        _Block(
          title: 'Messages from responders',
          child: report.messages.isEmpty
              ? const Text('No messages yet.',
                  style: TextStyle(color: AppColors.textMuted))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final m in report.messages.reversed) ...[
                      Text(formatDateTime(m.postedAt),
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 12)),
                      const SizedBox(height: 2),
                      Text(m.text, style: const TextStyle(fontSize: 16)),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
        ),
        _Block(title: 'Description', child: Text(report.description)),
        _Block(
          title: 'Location',
          child: Text(loc == null
              ? 'Not provided'
              : '${loc.latitude.toStringAsFixed(5)}, '
                  '${loc.longitude.toStringAsFixed(5)}'),
        ),
        _Block(
          title: 'Sent',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(formatDateTime(report.createdAt)),
              Text('Reference ${report.id}',
                  style: const TextStyle(color: AppColors.textMuted)),
            ],
          ),
        ),
      ],
    );
  }
}

class _Steps extends StatelessWidget {
  const _Steps({required this.current});

  final SosStatus current;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final s in SosStatus.values)
          Semantics(
            label: '${s.label}${s == current ? ', current step' : ''}',
            excludeSemantics: true,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Icon(
                    s.index < current.index
                        ? Icons.check_circle
                        : (s == current
                            ? (s == SosStatus.resolved
                                ? Icons.check_circle
                                : Icons.radio_button_checked)
                            : Icons.radio_button_unchecked),
                    color: s.index <= current.index
                        ? SosStatusBadge.colorOf(current)
                        : AppColors.textMuted,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    s.label,
                    style: TextStyle(
                      fontWeight:
                          s == current ? FontWeight.w700 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(title.toUpperCase(),
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMuted)),
              ),
              const SizedBox(height: 8),
              child,
            ],
          ),
        ),
      ),
    );
  }
}