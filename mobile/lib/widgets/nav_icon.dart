import 'package:flutter/material.dart';

import '../theme/ethio_theme.dart';

class NavGlyph extends StatelessWidget {
  const NavGlyph({
    super.key,
    required this.icon,
    this.selected = false,
    this.accent = ethioGreen,
  });

  final IconData icon;
  final bool selected;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      width: selected ? 48 : 40,
      height: 34,
      decoration: BoxDecoration(
        gradient: selected
            ? LinearGradient(
                colors: [
                  accent.withValues(alpha: 0.22),
                  accent.withValues(alpha: 0.08),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        borderRadius: BorderRadius.circular(12),
        border: selected
            ? Border.all(color: accent.withValues(alpha: 0.35), width: 1.2)
            : null,
      ),
      child: AnimatedScale(
        duration: const Duration(milliseconds: 200),
        scale: selected ? 1.08 : 1.0,
        child: Icon(
          icon,
          size: 22,
          color: selected ? accent : ethioMuted,
        ),
      ),
    );
  }
}
