import 'package:flutter/material.dart';

/// Learnex brand palette — matches the web app
class AppColors {
  AppColors._();

  // Brand
  static const Color brand = Color(0xFFCB26E4); // primary purple/magenta
  static const Color brandDark = Color(0xFFA61BB8);
  static const Color brandLight = Color(0xFFE57FF0);

  // Accents
  static const Color accent = Color(0xFF22C55E); // success green
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Light theme
  static const Color lightBg = Color(0xFFFAFAFA);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE5E7EB);
  static const Color lightText = Color(0xFF111827);
  static const Color lightTextMuted = Color(0xFF6B7280);

  // Dark theme
  static const Color darkBg = Color(0xFF0A0A0B);
  static const Color darkSurface = Color(0xFF18181B);
  static const Color darkSurfaceAlt = Color(0xFF27272A);
  static const Color darkBorder = Color(0xFF27272A);
  static const Color darkText = Color(0xFFF4F4F5);
  static const Color darkTextMuted = Color(0xFFA1A1AA);
}
