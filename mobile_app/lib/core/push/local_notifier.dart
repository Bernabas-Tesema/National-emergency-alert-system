import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../features/alerts/domain/push_payload.dart';
import '../theme/severity.dart';
import 'notification_taps.dart';

/// The channel IDs are part of the contract with the backend.
class NotificationChannels {
  static const critical = AndroidNotificationChannel(
    'alerts_critical',
    'Critical alerts',
    description: 'Life-threatening emergencies. Loud, even in silent mode.',
    importance: Importance.max,
    audioAttributesUsage: AudioAttributesUsage.alarm,
    enableVibration: true,
  );

  static const standard = AndroidNotificationChannel(
    'alerts_standard',
    'Alerts',
    description: 'Other emergency alerts and updates.',
    importance: Importance.high,
  );

  /// New alerts and updates of CRITICAL alerts are loud. An all-clear is good
  /// news and must never sound like an alarm, whatever the original severity.
  /// DECISION to confirm with the team.
  static AndroidNotificationChannel forPayload(PushPayload p) =>
      (p.severity == Severity.critical && p.type != PushType.allClear)
          ? critical
          : standard;
}

/// Shows alerts on the right channel. Works in the app and in the
/// background handler (which runs in its own isolate).
class LocalNotifier {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  static Future<void> ensureInitialized() async {
    if (_ready) return;
    await _plugin.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
      // The citizen tapped one of our notifications while the app was alive.
      onDidReceiveNotificationResponse: (r) => NotificationTaps.open(r.payload),
    );
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(NotificationChannels.critical);
    await android?.createNotificationChannel(NotificationChannels.standard);
    _ready = true;
  }

  /// The app was closed and a notification we drew started it.
  static Future<void> checkLaunch() async {
    final details = await _plugin.getNotificationAppLaunchDetails();
    if (details?.didNotificationLaunchApp == true) {
      NotificationTaps.open(details!.notificationResponse?.payload);
    }
  }

  static Future<void> show(PushPayload p) async {
    await ensureInitialized();
    final channel = NotificationChannels.forPayload(p);
    final loud = channel.id == NotificationChannels.critical.id;
    await _plugin.show(
      // The same alert id replaces the older notification, so an all-clear
      // takes the alarm out of the notification shade.
      p.alertId.hashCode,
      p.title,
      p.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channel.id,
          channel.name,
          channelDescription: channel.description,
          importance: channel.importance,
          priority: loud ? Priority.max : Priority.high,
          category: loud
              ? AndroidNotificationCategory.alarm
              : AndroidNotificationCategory.message,
          audioAttributesUsage: channel.audioAttributesUsage,
          visibility: NotificationVisibility.public,
        ),
      ),
      payload: p.alertId,
    );
  }
}