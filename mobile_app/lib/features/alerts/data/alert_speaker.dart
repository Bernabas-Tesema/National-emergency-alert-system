import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../domain/alert.dart';
import '../domain/alert_speech.dart';

/// ASSUMPTION: locale codes for the five languages. Whether a phone can speak
/// Amharic, Afan Oromo, Tigrinya or Somali depends on its speech engine.
const _locales = {
  'en': 'en-US',
  'am': 'am-ET',
  'om': 'om-ET',
  'ti': 'ti-ET',
  'so': 'so-SO',
};

class AlertSpeaker {
  // Created on first use, so tests never touch the platform.
  late final FlutterTts _tts = FlutterTts();
  bool _ready = false;
  final ValueNotifier<bool> speaking = ValueNotifier<bool>(false);

  void _init() {
    if (_ready) return;
    _ready = true;
    _tts.setStartHandler(() => speaking.value = true);
    _tts.setCompletionHandler(() => speaking.value = false);
    _tts.setCancelHandler(() => speaking.value = false);
    _tts.setErrorHandler((_) => speaking.value = false);
  }

  /// Returns false when this phone cannot read the alert's language aloud.
  Future<bool> speak(Alert alert) async {
    try {
      _init();
      final locale = _locales[alert.language] ?? alert.language;
      if (await _tts.isLanguageAvailable(locale) != true) return false;
      await _tts.setLanguage(locale);
      await _tts.setSpeechRate(0.45);
      await _tts.speak(alertSpeech(alert));
      return true;
    } catch (_) {
      speaking.value = false;
      return false;
    }
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {
      // Nothing to stop.
    }
    speaking.value = false;
  }

  void dispose() {
    if (_ready) _tts.stop().catchError((_) {});
    speaking.dispose();
  }
}

/// One speaker per open alert screen. Closing the screen stops the speech.
final alertSpeakerProvider = Provider.autoDispose<AlertSpeaker>((ref) {
  final speaker = AlertSpeaker();
  ref.onDispose(speaker.dispose);
  return speaker;
});