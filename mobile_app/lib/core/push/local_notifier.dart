import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../features/alerts/domain/push_payload.dart';
import '../theme/severity.dart';

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

  static AndroidNotificationChannel forSeverity(Severity s) =>
      s == Severity.critical ? critical : standard;
}

/// Shows alerts on the right channel. Works in the app and in the
/// background handler (which runs in its own isolate).
class LocalNotifier {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  static Future<void> ensureInitialized() async {
    if (_ready) return;
    await _plugin.initialize(const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ));
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(NotificationChannels.critical);
    await android?.createNotificationChannel(NotificationChannels.standard);
    _ready = true;
  }

  static Future<void> show(PushPayload p) async {
    await ensureInitialized();
    final channel = NotificationChannels.forSeverity(p.severity);
    final critical = p.severity == Severity.critical;
    await _plugin.show(
      p.alertId.hashCode, // same alert id replaces the older notification
      p.title,
      p.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channel.id,
          channel.name,
          channelDescription: channel.description,
          importance: channel.importance,
          priority: critical ? Priority.max : Priority.high,
          category: critical
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