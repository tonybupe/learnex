import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ── Brand ─────────────────────────────────────────────────────────
  static const Color brand     = Color(0xFFCB26E4);
  static const Color brandDark = Color(0xFFA61BB8);
  static const Color brandLight= Color(0xFFE57FF0);
  static const Color brandGlow = Color(0x40CB26E4); // 25% opacity for glow

  // ── Secondary brand gradient colors ───────────────────────────────
  static const Color violet    = Color(0xFF8B5CF6);
  static const Color sky       = Color(0xFF38BDF8);

  // ── Semantic ──────────────────────────────────────────────────────
  static const Color accent    = Color(0xFF22C55E);
  static const Color warning   = Color(0xFFF59E0B);
  static const Color danger    = Color(0xFFEF4444);
  static const Color info      = Color(0xFF3B82F6);

  // ── Light theme ───────────────────────────────────────────────────
  static const Color lightBg           = Color(0xFFF8F8FC);   // very subtle lavender tint
  static const Color lightSurface      = Color(0xFFFFFFFF);
  static const Color lightSurfaceAlt   = Color(0xFFF3F4F6);
  static const Color lightBorder       = Color(0xFFE5E7EB);
  static const Color lightBorderFocus  = Color(0xFFCB26E4);
  static const Color lightText         = Color(0xFF0F0F18);
  static const Color lightTextMuted    = Color(0xFF6B7280);
  static const Color lightGlass        = Color(0xCCFFFFFF);   // 80% white for glass
  static const Color lightGlassBorder  = Color(0x33CB26E4);   // 20% brand for glass border

  // ── Dark theme ────────────────────────────────────────────────────
  static const Color darkBg            = Color(0xFF080810);   // near-black with blue tint
  static const Color darkBgAlt         = Color(0xFF0E0E1A);
  static const Color darkSurface       = Color(0xFF14141F);   // dark card
  static const Color darkSurfaceAlt    = Color(0xFF1E1E2E);
  static const Color darkBorder        = Color(0xFF2D2D3F);
  static const Color darkBorderFocus   = Color(0xFFCB26E4);
  static const Color darkText          = Color(0xFFF0F0FF);   // cool white
  static const Color darkTextMuted     = Color(0xFF8888AA);
  static const Color darkGlass         = Color(0xB314141F);   // 70% dark for glass
  static const Color darkGlassBorder   = Color(0x33CB26E4);

  // ── Gradient presets ──────────────────────────────────────────────
  static const LinearGradient brandGradient = LinearGradient(
    colors: [brand, violet],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient brandGradientH = LinearGradient(
    colors: [brand, sky],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient darkBgGradient = LinearGradient(
    colors: [darkBg, Color(0xFF0A0A18)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}