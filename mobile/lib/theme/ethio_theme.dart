import 'package:flutter/material.dart';

/// Citizen app palette — emerald + amber (distinct from the web’s blue).
const Color ethioGreen = Color(0xFF0F766E);
const Color ethioForest = Color(0xFF115E59);
const Color ethioMint = Color(0xFFF0FDFA);
const Color ethioGold = Color(0xFFD97706);
const Color ethioAmber = Color(0xFFF59E0B);
const Color ethioInk = Color(0xFF134E4A);
const Color ethioMuted = Color(0xFF5B6B6A);
const Color ethioDanger = Color(0xFFDC2626);
const Color ethioSuccess = Color(0xFF059669);
const Color ethioSurface = Color(0xFFFFFFFF);
const Color ethioBorder = Color(0xFFCCFBF1);

ThemeData buildEthioTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: ethioGreen,
      primary: ethioGreen,
      secondary: ethioGold,
      surface: ethioSurface,
      error: ethioDanger,
      brightness: Brightness.light,
    ),
    scaffoldBackgroundColor: ethioMint,
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: ethioInk, displayColor: ethioInk),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: ethioInk,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: ethioInk,
        fontSize: 20,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.3,
      ),
    ),
    cardTheme: CardThemeData(
      color: ethioSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: ethioBorder),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: ethioSurface,
      elevation: 0,
      height: 72,
      indicatorColor: ethioGreen.withValues(alpha: 0.14),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          color: selected ? ethioGreen : ethioMuted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 22,
          color: selected ? ethioGreen : ethioMuted,
        );
      }),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: ethioGreen,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: ethioMint,
      selectedColor: ethioGreen.withValues(alpha: 0.16),
      side: const BorderSide(color: ethioBorder),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      labelStyle: const TextStyle(color: ethioInk, fontWeight: FontWeight.w600, fontSize: 12),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: ethioBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: ethioGreen, width: 1.6),
      ),
    ),
  );
}
