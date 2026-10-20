import 'package:flutter/material.dart';

import '../../core/format/time_format.dart';
import '../../core/theme/app_colors.dart';
import '../../features/alerts/domain/alert.dart';
import 'severity_badge.dart';

class AlertCard extends StatelessWidget {
  const AlertCard({super.key, required this.alert, required this.onTap});

  final Alert alert;
  final VoidCallback onTap;

  /// What a screen reader says for the whole card.
  String get _spoken => [
        switch (alert.status) {
          AlertStatus.allClear => 'All clear',
          AlertStatus.cancelled => 'Cancelled alert',
          AlertStatus.updated => '${alert.severity.label} alert, updated',
          AlertStatus.active => '${alert.severity.label} alert',
        },
        alert.title,
        if (alert.area.name.isNotEmpty) alert.area.name,
        timeAgo(alert.issuedAt),
      ].join('. ');

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      button: true,
      label: _spoken,
      onTap: onTap,
      excludeSemantics: true,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 8, color: alert.severity.color),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            SeverityBadge(severity: alert.severity),
                            if (alert.status != AlertStatus.active)
                              _StatusChip(status: alert.status),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          alert.title,
                          style: const TextStyle(
                              fontSize: 17, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            if (alert.area.name.isNotEmpty) alert.area.name,
                            timeAgo(alert.issuedAt),
                          ].join(' · '),
                          style: const TextStyle(color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: Icon(Icons.chevron_right, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final AlertStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      AlertStatus.allClear => AppColors.allClear,
      AlertStatus.cancelled => AppColors.textMuted,
      _ => AppColors.primary,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status.label,
        style:
            TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}