/// Cleans LLM markdown (**, __, #, bullets) into readable plain sections.
class AiFormattedText {
  AiFormattedText({required this.paragraphs, required this.bullets});

  final List<String> paragraphs;
  final List<String> bullets;

  static AiFormattedText parse(String raw) {
    final cleaned = _stripMarkdown(raw).trim();
    if (cleaned.isEmpty) {
      return AiFormattedText(paragraphs: const ['No reply'], bullets: const []);
    }

    final lines = cleaned
        .split(RegExp(r'\r?\n'))
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();

    final paragraphs = <String>[];
    final bullets = <String>[];

    for (final line in lines) {
      final bullet = _asBullet(line);
      if (bullet != null) {
        bullets.add(bullet);
      } else {
        paragraphs.add(line);
      }
    }

    if (paragraphs.isEmpty && bullets.isEmpty) {
      paragraphs.add(cleaned);
    }

    return AiFormattedText(paragraphs: paragraphs, bullets: bullets);
  }

  static String plain(String raw) {
    final parsed = parse(raw);
    final buf = StringBuffer();
    for (final p in parsed.paragraphs) {
      if (buf.isNotEmpty) buf.writeln();
      buf.write(p);
    }
    for (final b in parsed.bullets) {
      if (buf.isNotEmpty) buf.writeln();
      buf.write('• $b');
    }
    return buf.toString().trim();
  }

  static String _stripMarkdown(String input) {
    var text = input;
    // Remove fenced code blocks markers
    text = text.replaceAll(RegExp(r'```[\s\S]*?```'), '');
    text = text.replaceAll('```', '');
    // Bold / italic markers
    text = text.replaceAllMapped(
      RegExp(r'\*\*\*(.+?)\*\*\*'),
      (m) => m.group(1) ?? '',
    );
    text = text.replaceAllMapped(
      RegExp(r'\*\*(.+?)\*\*'),
      (m) => m.group(1) ?? '',
    );
    text = text.replaceAllMapped(
      RegExp(r'__(.+?)__'),
      (m) => m.group(1) ?? '',
    );
    text = text.replaceAllMapped(
      RegExp(r'(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)'),
      (m) => m.group(1) ?? '',
    );
    text = text.replaceAllMapped(
      RegExp(r'`([^`]+)`'),
      (m) => m.group(1) ?? '',
    );
    // Headings
    text = text.replaceAllMapped(
      RegExp(r'^#{1,6}\s*', multiLine: true),
      (_) => '',
    );
    // Stray leftover asterisks / underscores used as decoration
    text = text.replaceAll(RegExp(r'[*_]{2,}'), '');
    text = text.replaceAll(RegExp(r'(?<!\w)[*_](?!\w)'), '');
    return text;
  }

  static String? _asBullet(String line) {
    final m = RegExp(r'^(?:[-•*]|\d+[.)])\s+(.*)$').firstMatch(line);
    if (m == null) return null;
    final body = (m.group(1) ?? '').trim();
    return body.isEmpty ? null : body;
  }
}
