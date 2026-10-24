import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/location_service.dart';
import '../data/media_picker_service.dart';
import '../data/sos_repository.dart';
import '../domain/sos_report.dart';

final sosRepositoryProvider = Provider<SosRepository>(
  (ref) => SosRepository(ref.watch(dioProvider)),
);

// Providers, so tests can swap in fakes.
final locationServiceProvider =
    Provider<LocationService>((ref) => LocationService());
final mediaPickerProvider =
    Provider<MediaPickerService>((ref) => MediaPickerService());

final sosReportsProvider = FutureProvider.autoDispose<List<SosReport>>(
  (ref) => ref.watch(sosRepositoryProvider).mine(),
);