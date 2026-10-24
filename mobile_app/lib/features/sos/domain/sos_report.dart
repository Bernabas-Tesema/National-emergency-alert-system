import 'package:latlong2/latlong.dart';

import 'sos_category.dart';

enum SosStatus {
  received('received', 'Received'),
  assigned('assigned', 'Assigned'),
  inProgress('in_progress', 'In progress'),
  resolved('resolved', 'Resolved');

  const SosStatus(this.apiValue, this.label);
  final String apiValue;
  final String label;

  static SosStatus fromApi(String? value) => SosStatus.values.firstWhere(
        (s) => s.apiValue == value,
        orElse: () => SosStatus.received,
      );
}

class DispatcherMessage {
  const DispatcherMessage({required this.text, required this.postedAt});

  final String text;
  final DateTime postedAt;

  factory DispatcherMessage.fromJson(Map<String, dynamic> json) =>
      DispatcherMessage(
        text: (json['text'] ?? '').toString(),
        postedAt: DateTime.tryParse(json['postedAt']?.toString() ?? '')
                ?.toUtc() ??
            DateTime.now().toUtc(),
      );
}

/// A ticket as the citizen sees it.
/// ASSUMPTION: the response shape is not defined by the backend yet.
class SosReport {
  const SosReport({
    required this.id,
    required this.category,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.location,
    required this.messages,
  });

  final String id;
  final SosCategory category;
  final String description;
  final SosStatus status;
  final DateTime createdAt;
  final LatLng? location;
  final List<DispatcherMessage> messages;

  factory SosReport.fromJson(Map<String, dynamic> json) {
    final loc = json['location'];
    LatLng? point;
    if (loc is Map && loc['lat'] is num && loc['lng'] is num) {
      point = LatLng((loc['lat'] as num).toDouble(), (loc['lng'] as num).toDouble());
    }
    return SosReport(
      id: (json['id'] ?? '').toString(),
      category: SosCategory.fromApi(json['incidentType']?.toString()),
      description: (json['description'] ?? '').toString(),
      status: SosStatus.fromApi(json['status']?.toString()),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '')
              ?.toUtc() ??
          DateTime.now().toUtc(),
      location: point,
      messages: [
        for (final m in (json['messages'] as List?) ?? const [])
          DispatcherMessage.fromJson(m as Map<String, dynamic>),
      ],
    );
  }
}