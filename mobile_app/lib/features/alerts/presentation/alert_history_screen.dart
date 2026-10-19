import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../shared/widgets/alert_card.dart';
import '../../../shared/widgets/state_views.dart';
import '../application/alert_providers.dart';

class AlertHistoryScreen extends ConsumerWidget {
  const AlertHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(alertsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Alert history')),
      body: alerts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          message:
              e is ApiException ? e.message : 'Could not load your alerts.',
          onRetry: () => ref.invalidate(alertsProvider),
        ),
        data: (all) => RefreshIndicator(
          onRefresh: () async {
  ref.invalidate(alertsProvider);
  await ref.read(alertsProvider.future);
},
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              if (all.isEmpty)
                const EmptyView(
                  icon: Icons.history,
                  message: 'No alerts yet.',
                )
              else
                for (final a in all)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: AlertCard(
                      alert: a,
                      onTap: () => context.push('/alerts/${a.id}'),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}