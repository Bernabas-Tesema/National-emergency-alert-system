import 'package:flutter/material.dart';

import '../../features/sos/domain/sos_report.dart';

/// Light fill with a border, so it looks different from the solid severity badge.
class SosStatusBadge extends StatelessWidget {
  const SosStatusBadge({super.key, required this.status});

  final SosStatus status;

  static Color colorOf(SosStatus s) => switch (s) {
        SosStatus.received => const Color(0xFF475569),
        SosStatus.assigned => const Color(0xFF1D4ED8),
        SosStatus.inProgress => const Color(0xFF92400E),
        SosStatus.resolved => const Color(0xFF166534),
      };

  @override
  Widget build(BuildContext context) {
    final color = colorOf(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status.label,
        style: TextStyle(
            color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}