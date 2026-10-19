import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/severity.dart';
import '../../../shared/widgets/severity_badge.dart';
import '../../auth/application/auth_controller.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _offerQuickUnlock());
  }

  Future<void> _offerQuickUnlock() async {
    final storage = ref.read(tokenStorageProvider);
    if (await storage.readBiometricOffered()) return;
    if (!await ref.read(biometricServiceProvider).isAvailable()) return;
    if (!mounted) return;

    final accept = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Turn on quick unlock?'),
        content: const Text(
          'Use your fingerprint, face or screen lock to open the app '
          'next time, without waiting for an SMS code.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not now'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Turn on'),
          ),
        ],
      ),
    );
    await storage.saveBiometricOffered(true);
    if (accept == true) {
      await ref.read(authControllerProvider.notifier).enableBiometric();
    }
  }

  @override
  Widget build(BuildContext context) {
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