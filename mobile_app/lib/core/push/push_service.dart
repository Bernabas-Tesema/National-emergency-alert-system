
import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/alerts/domain/push_payload.dart';
import '../../features/auth/application/auth_controller.dart';
import '../device/device_binding.dart';
import '../network/api_client.dart';
import 'local_notifier.dart';

class PushService {
  PushService(this._dio, this._device);

  final Dio _dio;
  final DeviceBinding _device;
  bool _started = false;

  /// Call once after the citizen is signed in.
  Future<void> start() async {
    if (_started) return;
    _started = true;

    try {
      final messaging = FirebaseMessaging.instance;

      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus ==
          AuthorizationStatus.denied) {
        debugPrint('Notifications are turned off for this app.');
      }

      FirebaseMessaging.onMessage.listen(_onForeground);

      // TODO: move to register()/onRegistered once the backend decides
      // between FCM tokens and Firebase Installation IDs.
      // ignore: deprecated_member_use
      final token = await messaging.getToken();
      if (token != null) await _register(token);
      // ignore: deprecated_member_use
      messaging.onTokenRefresh.listen(_register);
    } catch (e) {
      // Most likely Firebase is not set up (google-services.json missing).
      debugPrint('Push not started: $e');
      _started = false;
    }
  }

  /// When the app is open, Android does not draw the notification itself.
  Future<void> _onForeground(RemoteMessage message) async {
    final payload = PushPayload.tryParse(
      message.data,
      fallbackTitle: message.notification?.title,
      fallbackBody: message.notification?.body,
      fallbackId: message.messageId,
    );

    if (payload != null) {
      await LocalNotifier.show(payload);
    }
  }

  /// ASSUMPTION: the registration endpoint is not defined by the backend yet.
  Future<void> _register(String token) async {
    if (kDebugMode) {
      debugPrint('FCM token: $token');
    }

    try {
      await _dio.post(
        '/devices',
        data: {
          'deviceId': await _device.deviceId(),
          'fcmToken': token,
          'platform':
              defaultTargetPlatform == TargetPlatform.iOS
                  ? 'ios'
                  : 'android',
        },
      );
    } on DioException catch (e) {
      debugPrint('Device registration failed: ${e.type}');
    }
  }
}

final pushServiceProvider = Provider<PushService>(
  (ref) => PushService(
    ref.watch(dioProvider),
    ref.watch(deviceBindingProvider),
  ),
);
