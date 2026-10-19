/// Mock alerts shaped like the Web Dev 1 handoff. All data is invented.
List<Map<String, dynamic>> mockAlertsJson() {
  final now = DateTime.now().toUtc();
  String ago(Duration d) => now.subtract(d).toIso8601String();

  return [
    {
      'id': 'ALT-2026-0892',
      'severity': 'CRITICAL',
      'status': 'active',
      'title': 'Flash flood warning: Bole',
      'message':
          'Heavy rain has raised the river level. Flooding is expected in low-lying areas.',
      'action': 'Move to higher ground now and avoid riverbanks.',
      'issuedAt': ago(const Duration(minutes: 25)),
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
    },
    {
      'id': 'ALT-2026-0897',
      'severity': 'HIGH',
      'status': 'updated',
      'title': 'Road closure: Bole Road',
      'message':
          'A burst water main has closed Bole Road near the airport junction.',
      'action': 'Use the ring road or Africa Avenue instead.',
      'issuedAt': ago(const Duration(hours: 3)),
      'issuedBy': 'Addis Ababa City Roads Authority',
      'language': 'en',
      'area': {
        'regionId': 'bole',
        'name': 'Bole',
        'polygon': [
          [8.995, 38.775],
          [8.995, 38.79],
          [8.985, 38.79],
          [8.985, 38.775],
        ],
      },
      'updates': [
        {
          'id': 'u-1',
          'text': 'Repair crews are on site. Expect delays until evening.',
          'postedAt': ago(const Duration(hours: 1)),
        },
      ],
    },
    {
      'id': 'ALT-2026-0894',
      'severity': 'MEDIUM',
      'status': 'all_clear',
      'title': 'Fire in Kality',
      'message': 'A warehouse fire was reported.',
      'action': 'Avoid the main road.',
      'issuedAt': ago(const Duration(days: 2, hours: 4)),
      'issuedBy': 'Addis Ababa Fire & Emergency Authority',
      'language': 'en',
      'area': {'regionId': 'kality', 'name': 'Kality', 'polygon': []},
      'updates': [
        {
          'id': 'u-2',
          'text': 'The fire is out. All clear.',
          'postedAt': ago(const Duration(days: 2)),
        },
      ],
    },
  ];
}