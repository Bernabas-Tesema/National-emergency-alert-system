/// In-memory SOS tickets for the mock API. All data is invented.
final List<Map<String, dynamic>> _reports = [];
int _counter = 100;

const _flow = ['received', 'assigned', 'in_progress', 'resolved'];
const _messages = {
  'assigned': 'A dispatcher has been assigned to your report.',
  'in_progress': 'A responder is handling your report.',
  'resolved': 'Your report has been resolved. Thank you.',
};

Map<String, dynamic> mockSosSubmit(Map body) {
  final report = <String, dynamic>{
    'id': 'SOS-${++_counter}',
    'incidentType': body['incident_type'],
    'description': body['description'],
    'status': 'received',
    'createdAt': DateTime.now().toUtc().toIso8601String(),
    'location': body['location'],
    'hasMedia': body['media_attachment_url'] != null,
    'messages': <Map<String, dynamic>>[],
  };
  _reports.insert(0, report);
  return report;
}

List<Map<String, dynamic>> mockSosList() => List.of(_reports);

/// Moves every ticket one step forward and adds a responder message.
void mockSosAdvance() {
  for (final r in _reports) {
    final i = _flow.indexOf(r['status'] as String);
    if (i < 0 || i >= _flow.length - 1) continue;
    final next = _flow[i + 1];
    r['status'] = next;
    (r['messages'] as List).add(<String, dynamic>{
      'text': _messages[next],
      'postedAt': DateTime.now().toUtc().toIso8601String(),
    });
  }
}

void mockSosReset() {
  _reports.clear();
  _counter = 100;
}