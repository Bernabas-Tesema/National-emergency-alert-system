import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/push/push_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/alert_card.dart';
import '../../../shared/widgets/state_views.dart';
import '../../auth/application/auth_controller.dart';
import '../application/alert_providers.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Notification permission first, then the quick-unlock offer.
      await ref.read(pushServiceProvider).start();
      if (mounted) await _offerQuickUnlock();
    });
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

  String _area(String id) =>
      id.isEmpty ? '' : '${id[0].toUpperCase()}${id.substring(1)}';

  @override
  Widget build(BuildContext context) {
    final citizen = ref.watch(authControllerProvider).citizen;
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          IconButton(
            tooltip: 'Alert history',
            icon: const Icon(Icons.history),
            onPressed: () => context.push('/history'),
          ),
          TextButton(
            onPressed: () =>
                ref.read(authControllerProvider.notifier).signOut(),
            child: const Text('Sign out'),
          ),
        ],
      ),
      body: alerts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          message:
              e is ApiException ? e.message : 'Could not load your alerts.',
          onRetry: () => ref.invalidate(alertsProvider),
        ),
        data: (all) {
          final active = all.where((a) => a.isActive).toList();
          return RefreshIndicator(
            onRefresh: () async {
  ref.invalidate(alertsProvider);
  await ref.read(alertsProvider.future);
},
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (citizen != null && citizen.registeredRegion.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Your area: ${_area(citizen.registeredRegion)}',
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                if (active.isEmpty)
                  const EmptyView(
                    icon: Icons.check_circle_outline,
                    message: 'No active alerts in your area.',
                  )
                else
                  for (final a in active)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: AlertCard(
                        alert: a,
                        onTap: () => context.push('/alerts/${a.id}'),
                      ),
                    ),
              ],
            ),
          );
        },
      ),
    );
  }
}