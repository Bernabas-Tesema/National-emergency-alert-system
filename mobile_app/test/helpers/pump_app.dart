import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:nea_citizen/app.dart';
import 'package:nea_citizen/core/device/device_binding.dart';
import 'package:nea_citizen/core/network/api_client.dart';
import 'package:nea_citizen/core/push/push_service.dart';
import 'package:nea_citizen/features/auth/application/auth_controller.dart';
import 'package:nea_citizen/features/auth/data/biometric_service.dart';
import 'package:nea_citizen/features/sos/application/sos_providers.dart';
import 'package:nea_citizen/features/sos/data/location_service.dart';
import 'package:nea_citizen/shared/widgets/map_tiles.dart';

import 'memory_storage.dart';

class _NoBiometric extends BiometricService {
  @override
  Future<bool> isAvailable() async => false;
  @override
  Future<bool> authenticate(String reason) async => false;
}

class _NoPush extends PushService {
  _NoPush(MemoryTokenStorage storage)
      : super(
          Dio(),
          DeviceBinding(storage, readFingerprint: () async => 'test-phone'),
          (_) {},
        );

  @override
  Future<void> start() async {}
}

/// A GPS that answers at once, or fails like a phone with location off.
class FakeLocation extends LocationService {
  FakeLocation({this.fail = false});

  final bool fail;

  @override
  Future<LatLng> current() async {
    if (fail) {
      throw const LocationException(
          'Location is turned off. Turn it on in your phone settings.');
    }
    return const LatLng(9.0108, 38.7613);
  }
}

/// Starts the real app with fake storage, biometrics, push, GPS and no map tiles.
/// The mock API is on by default, so no network is needed.
Future<void> pumpApp(
  WidgetTester tester,
  MemoryTokenStorage storage, {
  LocationService? location,
}) {
  return tester.pumpWidget(ProviderScope(
    overrides: [
      tokenStorageProvider.overrideWithValue(storage),
      deviceBindingProvider.overrideWithValue(
        DeviceBinding(storage, readFingerprint: () async => 'test-phone'),
      ),
      biometricServiceProvider.overrideWithValue(_NoBiometric()),
      pushServiceProvider.overrideWithValue(_NoPush(storage)),
      locationServiceProvider.overrideWithValue(location ?? FakeLocation()),
      mapTilesProvider.overrideWithValue(false),
    ],
    child: const NeaApp(),
  ));
}

/// Lets timers and the mock API finish. pumpAndSettle cannot be used
/// because spinners animate forever.
Future<void> advance(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 500));
  }
}

/// Removes the app so periodic timers are cancelled before the test ends.
Future<void> closeApp(WidgetTester tester) =>
    tester.pumpWidget(const SizedBox.shrink());
    /// A tall test screen, so long pages build every item without scrolling.
void useTallScreen(
  WidgetTester tester, {
  double width = 800,
  double height = 3000,
  double pixelRatio = 1.0,
}) {
  tester.view.physicalSize = Size(width * pixelRatio, height * pixelRatio);
  tester.view.devicePixelRatio = pixelRatio;
  addTearDown(tester.view.reset);
}