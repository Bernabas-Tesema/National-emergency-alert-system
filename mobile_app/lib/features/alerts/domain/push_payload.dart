import '../../../core/theme/severity.dart';

enum PushType { alert, alertUpdate, allClear }

/// The small message the backend sends. Matches the handoff draft:
/// type, alertId, severity, title, body, language. ASSUMPTION until confirmed.
class PushPayload {
  const PushPayload({
    required this.type,
    required this.alertId,
    required this.severity,
    required this.title,
    required this.body,
    this.language,
  });

  final PushType type;
  final String alertId;
  final Severity severity;
  final String title;
  final String body;
  final String? language;

  /// Returns null when there is nothing to show (no title at all).
  static PushPayload? tryParse(
    Map<String, dynamic> data, {
    String? fallbackTitle,
    String? fallbackBody,
    String? fallbackId,
  }) {
    final title = (data['title'] ?? fallbackTitle)?.toString();
    if (title == null || title.isEmpty) return null;
    return PushPayload(
      type: _type(data['type']?.toString()),
      alertId: (data['alertId'] ?? fallbackId ?? title).toString(),
      severity: Severity.fromApi(data['severity']?.toString() ?? 'HIGH'),
      title: title,
      body: (data['body'] ?? fallbackBody ?? '').toString(),
      language: data['language']?.toString(),
    );
  }

  static PushType _type(String? value) => switch (value) {
        'alert_update' => PushType.alertUpdate,
        'all_clear' => PushType.allClear,
        _ => PushType.alert,
      };
}