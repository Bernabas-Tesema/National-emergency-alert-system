import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/app.dart';
import 'package:nea_citizen/core/device/device_binding.dart';
import 'package:nea_citizen/core/network/api_client.dart';
import 'package:nea_citizen/core/push/push_service.dart';
import 'package:nea_citizen/features/auth/application/auth_controller.dart';
import 'package:nea_citizen/features/auth/data/biometric_service.dart';

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

/// Starts the real app with fake storage, biometrics and push.
/// The mock API is on by default, so no network is needed.
Future<void> pumpApp(WidgetTester tester, MemoryTokenStorage storage) {
  return tester.pumpWidget(ProviderScope(
    overrides: [
      tokenStorageProvider.overrideWithValue(storage),
      deviceBindingProvider.overrideWithValue(
        DeviceBinding(storage, readFingerprint: () async => 'test-phone'),
      ),
      biometricServiceProvider.overrideWithValue(_NoBiometric()),
      pushServiceProvider.overrideWithValue(_NoPush(storage)),
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