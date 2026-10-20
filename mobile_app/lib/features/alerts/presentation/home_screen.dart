import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/mock_alerts.dart';
import '../../../core/push/notification_taps.dart';
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

class _HomeScreenState extends ConsumerState<HomeScreen>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    NotificationTaps.pending.addListener(_openPending);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      _openPending(); // a notification may have started the app
      // Notification permission first, then the quick-unlock offer.
      await ref.read(pushServiceProvider).start();
      if (mounted) await _offerQuickUnlock();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    NotificationTaps.pending.removeListener(_openPending);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Back in the app: alerts may have changed while it was away.
    if (state == AppLifecycleState.resumed) _refreshAll();
  }

  void _refreshAll() {
    ref.invalidate(alertsProvider);
    ref.invalidate(alertDetailProvider); // every open detail page
  }

  void _openPending() {
    if (!mounted) return;
    final id = NotificationTaps.take();
    if (id != null) context.push('/alerts/$id');
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
          // Only in debug builds with the mock API: lets you test the
          // all-clear flow without a backend.
          if (AppConfig.useMock && kDebugMode)
            PopupMenuButton<String>(
              tooltip: 'Test tools',
              icon: const Icon(Icons.bug_report_outlined),
              onSelected: (value) {
                if (value == 'clear') mockClearedAlertIds.add('ALT-2026-0892');
                if (value == 'reset') mockClearedAlertIds.clear();
                _refreshAll();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: 'clear',
                  child: Text('Simulate: all clear for the flood'),
                ),
                PopupMenuItem(
                  value: 'reset',
                  child: Text('Reset test alerts'),
                ),
              ],
            ),
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