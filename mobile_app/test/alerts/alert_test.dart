import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:nea_citizen/core/theme/severity.dart';
import 'package:nea_citizen/features/alerts/domain/alert.dart';

void main() {
  final critical = Alert.fromJson({
    'id': 'ALT-2026-0892',
    'severity': 'CRITICAL',
    'status': 'active',
    'title': 'Flash flood warning: Bole',
    'message': 'Heavy rain has raised the river level.',
    'action': 'Move to higher ground now.',
    'issuedAt': '2026-10-16T07:30:00Z',
    'issuedBy': 'Addis Ababa Fire & Emergency Authority',
    'language': 'en',
    'area': {
      'regionId': 'bole',
      'name': 'Bole',
      'polygon': [
        [8.99, 38.76],
        [8.99, 38.8],
        [8.96, 38.8],
        [8.96, 38.76],
      ],
    },
    'updates': [],
  });

  test('parses the handoff sample', () {
    expect(critical.severity, Severity.critical);
    expect(critical.status, AlertStatus.active);
    expect(critical.isActive, isTrue);
    expect(critical.area.polygon.length, 4);
    expect(critical.area.polygon.first, const LatLng(8.99, 38.76));
    expect(critical.issuedAt, DateTime.utc(2026, 10, 16, 7, 30));
  });

  test('all clear is not active and keeps its updates', () {
    final a = Alert.fromJson({
      'id': 'ALT-2026-0894',
      'severity': 'MEDIUM',
      'status': 'all_clear',
      'area': {'regionId': 'kality', 'name': 'Kality', 'polygon': []},
      'updates': [
        {
          'id': 'u-2',
          'text': 'The fire is out. All clear.',
          'postedAt': '2026-10-14T18:30:00Z',
        },
      ],
    });
    expect(a.status, AlertStatus.allClear);
    expect(a.isActive, isFalse);
    expect(a.area.polygon, isEmpty);
    expect(a.updates.single.text, 'The fire is out. All clear.');
  });

  test('unknown status is treated as active, never all clear', () {
    final a = Alert.fromJson({'id': 'x', 'status': 'weird'});
    expect(a.status, AlertStatus.active);
    expect(a.isActive, isTrue);
  });

  test('missing fields do not crash', () {
    final a = Alert.fromJson({'id': 'x'});
    expect(a.title, 'Emergency alert');
    expect(a.severity, Severity.high);
    expect(a.updates, isEmpty);
  });

  test('malformed polygon points are skipped', () {
    final area = AlertArea.fromJson({
      'name': 'X',
      'polygon': [
        [8.9, 38.7],
        ['a', 'b'],
        [8.9],
      ],
    });
    expect(area.polygon.length, 1);
  });
}