final _pattern = RegExp(r'^(?:\+?251|0)?([79]\d{8})$');

/// Turns "0911 000 201", "911000201" or "+251911000201" into "+251911000201".
/// Returns null if the input is not a valid Ethiopian mobile number.
String? normalizeEthiopianPhone(String input) {
  final cleaned = input.replaceAll(RegExp(r'[\s\-()]'), '');
  final match = _pattern.firstMatch(cleaned);
  if (match == null) return null;
  return '+251${match.group(1)}';
}