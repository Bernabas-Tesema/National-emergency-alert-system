import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/theme/severity.dart';
import 'package:nea_citizen/features/alerts/domain/push_payload.dart';

void main() {
  test('parses the handoff payload', () {
    final p = PushPayload.tryParse({
      'type': 'alert',
      'alertId': 'ALT-2026-0892',
      'severity': 'CRITICAL',
      'title': 'Flash flood warning: Bole',
      'body': 'Move to higher ground now.',
      'language': 'en',
    })!;
    expect(p.alertId, 'ALT-2026-0892');
    expect(p.severity, Severity.critical);
    expect(p.type, PushType.alert);
    expect(p.language, 'en');
  });

  test('understands update and all_clear types', () {
    expect(
      PushPayload.tryParse({'type': 'all_clear', 'title': 'x'})!.type,
      PushType.allClear,
    );
    expect(
      PushPayload.tryParse({'type': 'alert_update', 'title': 'x'})!.type,
      PushType.alertUpdate,
    );
  });

  test('falls back to the notification text and ignores severity case', () {
    final p = PushPayload.tryParse(
      {'severity': 'low'},
      fallbackTitle: 'Hello',
      fallbackBody: 'World',
      fallbackId: 'msg-1',
    )!;
    expect(p.title, 'Hello');
    expect(p.body, 'World');
    expect(p.alertId, 'msg-1');
    expect(p.severity, Severity.low);
  });

  test('returns null when there is no title', () {
    expect(PushPayload.tryParse({'alertId': 'A1'}), isNull);
  });

  test('unknown severity is treated as high, never lower', () {
    expect(
      PushPayload.tryParse({'title': 'x', 'severity': 'weird'})!.severity,
      Severity.high,
    );
  });
}