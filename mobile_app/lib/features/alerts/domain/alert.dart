import 'package:latlong2/latlong.dart';

import '../../../core/theme/severity.dart';

enum AlertStatus {
  active('active', 'Active'),
  updated('updated', 'Updated'),
  allClear('all_clear', 'All clear'),
  cancelled('cancelled', 'Cancelled');

  const AlertStatus(this.apiValue, this.label);
  final String apiValue;
  final String label;

  /// Unknown values count as active, so a citizen is never told
  /// "all clear" by mistake.
  static AlertStatus fromApi(String? value) => AlertStatus.values.firstWhere(
        (s) => s.apiValue == value,
        orElse: () => AlertStatus.active,
      );
}

class AlertUpdate {
  const AlertUpdate({
    required this.id,
    required this.text,
    required this.postedAt,
  });

  final String id;
  final String text;
  final DateTime postedAt;

  factory AlertUpdate.fromJson(Map<String, dynamic> json) => AlertUpdate(
        id: (json['id'] ?? '').toString(),
        text: (json['text'] ?? '').toString(),
        postedAt: _parseTime(json['postedAt']),
      );
}

class AlertArea {
  const AlertArea({
    required this.regionId,
    required this.name,
    required this.polygon,
  });

  final String regionId;
  final String name;

  /// Corners as latitude, longitude. ASSUMPTION: the backend must confirm
  /// the order (GeoJSON uses longitude first).
  final List<LatLng> polygon;

  factory AlertArea.fromJson(Map<String, dynamic>? json) {
    final raw = (json?['polygon'] as List?) ?? const [];
    final points = <LatLng>[];
    for (final p in raw) {
      if (p is List && p.length >= 2 && p[0] is num && p[1] is num) {
        points.add(LatLng((p[0] as num).toDouble(), (p[1] as num).toDouble()));
      }
    }
    return AlertArea(
      regionId: (json?['regionId'] ?? '').toString(),
      name: (json?['name'] ?? '').toString(),
      polygon: points,
    );
  }
}

class Alert {
  const Alert({
    required this.id,
    required this.severity,
    required this.status,
    required this.title,
    required this.message,
    required this.action,
    required this.issuedAt,
    required this.issuedBy,
    required this.language,
    required this.area,
    required this.updates,
  });

  final String id;
  final Severity severity;
  final AlertStatus status;
  final String title;
  final String message; // what happened
  final String action; // what to do
  final DateTime issuedAt;
  final String issuedBy;
  final String language;
  final AlertArea area;
  final List<AlertUpdate> updates;

  bool get isActive =>
      status == AlertStatus.active || status == AlertStatus.updated;

  /// ASSUMPTION: shape from the Web Dev 1 handoff (title, message, action
  /// split). Not confirmed by the backend or Web Dev 2 yet.
  factory Alert.fromJson(Map<String, dynamic> json) => Alert(
        id: (json['id'] ?? '').toString(),
        severity: Severity.fromApi((json['severity'] ?? 'HIGH').toString()),
        status: AlertStatus.fromApi(json['status']?.toString()),
        title: (json['title'] as String?) ?? 'Emergency alert',
        message: (json['message'] as String?) ?? '',
        action: (json['action'] as String?) ?? '',
        issuedAt: _parseTime(json['issuedAt']),
        issuedBy: (json['issuedBy'] as String?) ?? '',
        language: (json['language'] as String?) ?? 'en',
        area: AlertArea.fromJson(json['area'] as Map<String, dynamic>?),
        updates: [
          for (final u in (json['updates'] as List?) ?? const [])
            AlertUpdate.fromJson(u as Map<String, dynamic>),
        ],
      );
}

DateTime _parseTime(Object? value) =>
    DateTime.tryParse(value?.toString() ?? '')?.toUtc() ??
    DateTime.now().toUtc();