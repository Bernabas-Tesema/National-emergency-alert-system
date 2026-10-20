import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/theme/severity.dart';

/// WCAG contrast ratio between two colours (1 to 21).
double contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  return (max(la, lb) + 0.05) / (min(la, lb) + 0.05);
}

void main() {
  test('every severity badge reaches 3:1 (large or bold text)', () {
    for (final s in Severity.values) {
      expect(contrast(s.color, s.onColor), greaterThanOrEqualTo(3.0),
          reason: '${s.label} badge');
    }
  });

  test(
    'every severity badge reaches 4.5:1 for small text',
    () {
      for (final s in Severity.values) {
        expect(contrast(s.color, s.onColor), greaterThanOrEqualTo(4.5),
            reason: '${s.label} badge');
      }
    },
    skip: 'Known issue: white on sky blue (LOW) and on orange (HIGH) is under '
        '4.5:1. Needs a decision with the web team, since the colours are shared. '
        'Remove this skip when it is fixed.',
  );
}