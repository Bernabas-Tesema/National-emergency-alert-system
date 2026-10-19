import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/severity.dart';
import '../../../shared/widgets/severity_badge.dart';
import '../../auth/application/auth_controller.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final citizen = ref.watch(authControllerProvider).citizen;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          TextButton(
            onPressed: () =>
                ref.read(authControllerProvider.notifier).signOut(),
            child: const Text('Sign out'),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Signed in as ${citizen?.phone ?? ''}'),
            Text('Registered area: ${citizen?.registeredRegion ?? ''}'),
            const SizedBox(height: 24),
            const Text('Active alerts will appear here (Step 7).'),
            const SizedBox(height: 24),
            for (final s in Severity.values) ...[
              Align(
                alignment: Alignment.centerLeft,
                child: SeverityBadge(severity: s),
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}