import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/time_format.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/area_map.dart';
import '../../../shared/widgets/state_views.dart';
import '../application/alert_providers.dart';
import '../domain/alert.dart';

class AlertDetailScreen extends ConsumerWidget {
  const AlertDetailScreen({super.key, required this.alertId});

  final String alertId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alert = ref.watch(alertDetailProvider(alertId));
    return Scaffold(
      appBar: AppBar(title: const Text('Alert')),
      body: alert.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          message: e is ApiException ? e.message : 'Could not load this alert.',
          onRetry: () => ref.invalidate(alertDetailProvider(alertId)),
        ),
        data: (a) => _Body(alert: a),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.alert});

  final Alert alert;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _Banner(alert: alert),
        const SizedBox(height: 16),
        Text(alert.title,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),
        if (alert.message.isNotEmpty)
          _Section(
            title: 'What happened',
            child: Text(alert.message, style: const TextStyle(fontSize: 16)),
          ),
        if (alert.action.isNotEmpty)
          _Section(
            title: 'What to do',
            borderColor: alert.severity.color,
            child: Text(alert.action,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
        _Section(
          title: 'Affected area',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (alert.area.name.isNotEmpty)
                Text(alert.area.name, style: const TextStyle(fontSize: 16)),
              if (alert.area.polygon.length >= 3) ...[
                const SizedBox(height: 12),
                AreaMap(polygon: alert.area.polygon, severity: alert.severity),
              ],
            ],
          ),
        ),
        if (alert.updates.isNotEmpty)
          _Section(
            title: 'Updates',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final u in alert.updates.reversed) ...[
                  Text(formatDateTime(u.postedAt),
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12)),
                  const SizedBox(height: 2),
                  Text(u.text, style: const TextStyle(fontSize: 16)),
                  const SizedBox(height: 12),
                ],
              ],
            ),
          ),
        _Section(
          title: 'Issued',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(formatDateTime(alert.issuedAt)),
              if (alert.issuedBy.isNotEmpty)
                Text(alert.issuedBy,
                    style: const TextStyle(color: AppColors.textMuted)),
            ],
          ),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.alert});

  final Alert alert;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg, String title, String? subtitle) =
        switch (alert.status) {
      AlertStatus.allClear => (
          AppColors.allClear,
          Colors.white,
          'ALL CLEAR',
          'This alert has ended.',
        ),
      AlertStatus.cancelled => (
          AppColors.textMuted,
          Colors.white,
          'CANCELLED',
          'This alert was cancelled.',
        ),
      AlertStatus.updated => (
          alert.severity.color,
          alert.severity.onColor,
          '${alert.severity.label.toUpperCase()} · UPDATED',
          null,
        ),
      AlertStatus.active => (
          alert.severity.color,
          alert.severity.onColor,
          '${alert.severity.label.toUpperCase()} ALERT',
          null,
        ),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                  color: fg, fontWeight: FontWeight.w800, fontSize: 16)),
          if (subtitle != null)
            Text(subtitle, style: TextStyle(color: fg)),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child, this.borderColor});

  final String title;
  final Widget child;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: borderColor == null
              ? BorderSide.none
              : BorderSide(color: borderColor!, width: 2),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title.toUpperCase(),
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMuted)),
              const SizedBox(height: 8),
              child,
            ],
          ),
        ),
      ),
    );
  }
}