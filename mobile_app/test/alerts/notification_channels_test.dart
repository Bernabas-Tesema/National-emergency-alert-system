import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/push/local_notifier.dart';
import 'package:nea_citizen/core/push/notification_taps.dart';
import 'package:nea_citizen/core/theme/severity.dart';
import 'package:nea_citizen/features/alerts/domain/push_payload.dart';

PushPayload _p(PushType type, Severity severity) => PushPayload(
      type: type,
      alertId: 'A1',
      severity: severity,
      title: 't',
      body: 'b',
    );

void main() {
  group('channel choice', () {
    test('a critical alert and a critical update are loud', () {
      expect(
        NotificationChannels.forPayload(_p(PushType.alert, Severity.critical)).id,
        'alerts_critical',
      );
      expect(
        NotificationChannels.forPayload(
                _p(PushType.alertUpdate, Severity.critical))
            .id,
        'alerts_critical',
      );
    });

    test('an all-clear is never loud, even for a critical alert', () {
      expect(
        NotificationChannels.forPayload(_p(PushType.allClear, Severity.critical))
            .id,
        'alerts_standard',
      );
    });

    test('other severities use the standard channel', () {
      for (final s in [Severity.low, Severity.medium, Severity.high]) {
        expect(NotificationChannels.forPayload(_p(PushType.alert, s)).id,
            'alerts_standard');
      }
    });
  });

  group('notification taps', () {
    setUp(() => NotificationTaps.pending.value = null);

    test('open stores the id and take returns it once', () {
      NotificationTaps.open('ALT-1');
      expect(NotificationTaps.take(), 'ALT-1');
      expect(NotificationTaps.take(), isNull);
    });

    test('empty or null ids are ignored', () {
      NotificationTaps.open(null);
      NotificationTaps.open('');
      expect(NotificationTaps.take(), isNull);
    });
  });
}