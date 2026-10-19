import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/features/auth/domain/phone_number.dart';

void main() {
  test('accepts common formats', () {
    for (final input in [
      '0911000201',
      '911000201',
      '+251911000201',
      '+251 911 000 201',
      '251911000201',
    ]) {
      expect(normalizeEthiopianPhone(input), '+251911000201');
    }
  });

  test('rejects invalid numbers', () {
    for (final input in ['', '123', '0811000201', '+25191100020']) {
      expect(normalizeEthiopianPhone(input), isNull);
    }
  });
}