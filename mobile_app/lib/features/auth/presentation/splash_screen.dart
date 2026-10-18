import 'package:flutter/material.dart';
import '../../../core/theme/severity.dart';
import '../../../shared/widgets/severity_badge.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('National Emergency Alert',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            for (final s in Severity.values) ...[
              SeverityBadge(severity: s),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}