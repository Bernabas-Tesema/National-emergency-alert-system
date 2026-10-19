import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/format/time_format.dart';

void main() {
  final now = DateTime.utc(2026, 10, 20, 12, 0);

  test('timeAgo steps', () {
    expect(timeAgo(now, now: now), 'Just now');
    expect(timeAgo(now.subtract(const Duration(minutes: 25)), now: now),
        '25 min ago');
    expect(timeAgo(now.subtract(const Duration(hours: 3)), now: now), '3 h ago');
    expect(timeAgo(now.subtract(const Duration(days: 2)), now: now), '2 d ago');
  });

  test('a future time (clock skew) reads as just now', () {
    expect(timeAgo(now.add(const Duration(minutes: 5)), now: now), 'Just now');
  });
}