import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/network/mock_alerts.dart';
import 'package:nea_citizen/features/alerts/domain/alert.dart';
import 'package:nea_citizen/features/alerts/domain/alert_speech.dart';

void main() {
  test('an English critical alert is read with spoken labels', () {
    final text = alertSpeech(Alert.fromJson(mockAlertsJson().first));
    expect(text, startsWith('Critical alert. Flash flood warning: Bole.'));
    expect(text, contains('What happened.'));
    expect(text, contains('What to do. Move to higher ground now'));
  });

  test('an all-clear starts with the good news and reads the last update', () {
    final kality = mockAlertsJson().last; // ALT-2026-0894
    final text = alertSpeech(Alert.fromJson(kality));
    expect(text, startsWith('All clear.'));
    expect(text, contains('Latest update. The fire is out. All clear.'));
  });

  test('other languages read only the alert text, no English words', () {
    final text = alertSpeech(Alert.fromJson({
      'id': 'x',
      'language': 'am',
      'title': 'Title',
      'message': 'Message',
      'action': 'Action',
    }));
    expect(text, 'Title. Message. Action.');
    expect(text, isNot(contains('What happened')));
  });
}