import 'package:flutter/material.dart';

class AppColors {
  // Slate base (matches the web shadcn Slate preset)
  static const primary = Color(0xFF0F172A); // slate-900
  static const background = Color(0xFFF1F5F9); // slate-100 (page)
  static const surface = Color(0xFFFFFFFF); // cards
  static const text = Color(0xFF0F172A); // slate-900
  static const textMuted = Color(0xFF64748B); // slate-500
  static const border = Color(0xFFCBD5E1); // slate-300

  // Feedback (web design doc section 5)
  static const success = Color(0xFF16A34A); // green-600
  static const error = Color(0xFFDC2626); // red-600
  static const warning = Color(0xFF92400E); // amber-800

  // Not decided yet. Green is the suggestion in the design doc.
  static const allClear = Color(0xFF16A34A);
}