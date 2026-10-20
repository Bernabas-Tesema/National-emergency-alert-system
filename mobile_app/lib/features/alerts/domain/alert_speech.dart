import 'alert.dart';

/// What the phone reads aloud for an alert.
///
/// English alerts get spoken labels ("What to do."). For other languages the
/// alert text is already in the citizen's language, so we read only that and
/// never mix English words into it.
String alertSpeech(Alert alert) {
  final parts = <String>[];

  if (alert.language == 'en') {
    parts.add(switch (alert.status) {
      AlertStatus.allClear => 'All clear.',
      AlertStatus.cancelled => 'Alert cancelled.',
      AlertStatus.updated => '${alert.severity.label} alert, updated.',
      AlertStatus.active => '${alert.severity.label} alert.',
    });
    parts.add(_sentence(alert.title));
    if (alert.message.trim().isNotEmpty) {
      parts.add('What happened. ${_sentence(alert.message)}');
    }
    if (alert.action.trim().isNotEmpty) {
      parts.add('What to do. ${_sentence(alert.action)}');
    }
    if (alert.updates.isNotEmpty) {
      parts.add('Latest update. ${_sentence(alert.updates.last.text)}');
    }
  } else {
    parts
      ..add(_sentence(alert.title))
      ..add(_sentence(alert.message))
      ..add(_sentence(alert.action));
    if (alert.updates.isNotEmpty) {
      parts.add(_sentence(alert.updates.last.text));
    }
  }

  return parts.where((p) => p.isNotEmpty).join(' ');
}

/// Adds a full stop, so the speech engine pauses between parts.
String _sentence(String text) {
  final t = text.trim();
  if (t.isEmpty) return '';
  return RegExp(r'[.!?\u1362]$').hasMatch(t) ? t : '$t.';
}