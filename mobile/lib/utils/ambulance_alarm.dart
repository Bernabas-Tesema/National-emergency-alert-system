import 'package:flutter/services.dart';

class AmbulanceAlarm {
  static const _channel = MethodChannel('et.ethioalert/alarm');
  static bool _isPlaying = false;

  static bool get isPlaying => _isPlaying;

  /// Posts a system notification and plays a loud ambulance siren + voice warning for critical alerts.
  static Future<void> playAlertAlarm({
    required String title,
    required String message,
    bool isCritical = true,
  }) async {
    _isPlaying = true;
    final cleanMessage = message.split('\n').first.trim();
    final speechText = isCritical
        ? 'Critical Emergency Alert! $title. $cleanMessage. Please move to safety immediately.'
        : 'Emergency Advisory. $title. $cleanMessage.';

    try {
      await HapticFeedback.heavyImpact();
      await _channel.invokeMethod('playAmbulanceAlarm', {
        'title': title,
        'body': cleanMessage,
        'text': speechText,
        'durationMs': 3600,
        'isCritical': isCritical,
      });
    } catch (_) {
      try {
        await SystemSound.play(SystemSoundType.alert);
        await HapticFeedback.vibrate();
      } catch (_) {}
    }
  }

  /// Posts an Android heads-up notification without blasting the full siren.
  static Future<void> showNotification({
    required String title,
    required String message,
    bool isCritical = false,
  }) async {
    final cleanMessage = message.split('\n').first.trim();
    try {
      await _channel.invokeMethod('showNotification', {
        'title': title,
        'body': cleanMessage,
        'isCritical': isCritical,
      });
    } catch (_) {}
  }

  /// Stops any currently playing ambulance siren or voice warning.
  static Future<void> stopAlarm() async {
    _isPlaying = false;
    try {
      await _channel.invokeMethod('stopAlarm');
    } catch (_) {}
  }
}
