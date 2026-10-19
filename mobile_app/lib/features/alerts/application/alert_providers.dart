import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/alert_repository.dart';
import '../domain/alert.dart';

final alertRepositoryProvider = Provider<AlertRepository>(
  (ref) => AlertRepository(ref.watch(dioProvider)),
);

/// All alerts for this citizen. Home shows the active ones, History all.
final alertsProvider = FutureProvider.autoDispose<List<Alert>>(
  (ref) => ref.watch(alertRepositoryProvider).mine(),
);

final alertDetailProvider = FutureProvider.autoDispose.family<Alert, String>(
  (ref, id) => ref.watch(alertRepositoryProvider).byId(id),
);