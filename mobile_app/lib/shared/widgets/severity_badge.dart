import 'package:flutter/material.dart';
import '../../core/theme/severity.dart';

class SeverityBadge extends StatelessWidget {
  const SeverityBadge({super.key, required this.severity});

  final Severity severity;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: severity.color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        severity.label.toUpperCase(),
        style: TextStyle(
          color: severity.onColor,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}