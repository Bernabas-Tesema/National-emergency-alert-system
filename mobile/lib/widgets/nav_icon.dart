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
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      width: 42,
      height: 32,
      decoration: BoxDecoration(
        color: selected ? accent.withValues(alpha: 0.16) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        icon,
        size: 22,
        color: selected ? accent : ethioMuted,
      ),
    );
  }
}
