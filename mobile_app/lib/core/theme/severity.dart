import 'package:flutter/material.dart';

enum Channel { push, sms, voice }

enum Severity {
  low('LOW', 'Low', Color(0xFF0284C7), Colors.white, [Channel.push]),
  medium('MEDIUM', 'Medium', Color(0xFFFACC15), Color(0xFF1F2937),
      [Channel.push, Channel.sms]),
  high('HIGH', 'High', Color(0xFFEA580C), Colors.white,
      [Channel.push, Channel.sms]),
  critical('CRITICAL', 'Critical', Color(0xFFB91C1C), Colors.white,
      [Channel.push, Channel.sms, Channel.voice]);

  const Severity(
    this.apiValue,
    this.label,
    this.color,
    this.onColor,
    this.defaultChannels,
  );

  final String apiValue; // what the backend sends
  final String label; // text shown on screen (never rely on colour alone)
  final Color color;
  final Color onColor; // text colour on top of [color]
  final List<Channel> defaultChannels;

  /// Maps backend values ('information', 'warning', 'critical') and legacy formats
  /// to our UI severity levels. Unknown values fall back to high so we never under-warn.
  static Severity fromApi(String value) {
    switch (value.toLowerCase()) {
      case 'information':
      case 'low':
        return Severity.low;
      case 'warning':
      case 'medium':
        return Severity.medium;
      case 'high':
        return Severity.high;
      case 'critical':
        return Severity.critical;
      default:
        return Severity.high;
    }
  }
}
