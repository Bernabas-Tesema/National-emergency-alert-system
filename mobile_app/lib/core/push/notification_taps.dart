import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Remembers "the citizen tapped a notification for this alert" until the
/// Home screen is on screen and can open it. Because Home only exists after
/// sign-in and unlock, the lock screen is never skipped.
class NotificationTaps {
  static final ValueNotifier<String?> pending = ValueNotifier<String?>(null);

  static void open(String? alertId) {
    if (alertId == null || alertId.isEmpty) return;
    pending.value = alertId;
  }

  /// Returns the waiting alert id (if any) and clears it.
  static String? take() {
    final id = pending.value;
    pending.value = null;
    return id;
  }

  /// Taps on notifications the system drew itself (FCM notification messages).
  static Future<void> listenToPushTaps() async {
    FirebaseMessaging.onMessageOpenedApp
        .listen((m) => open(m.data['alertId']?.toString()));
    // The app was closed and a notification tap started it.
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    open(initial?.data['alertId']?.toString());
  }
}