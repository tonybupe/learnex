import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static TextTheme _textTheme(Color body, Color display) {
    return GoogleFonts.interTextTheme().copyWith(
      displayLarge:  GoogleFonts.inter(color: display, fontWeight: FontWeight.w900, letterSpacing: -0.5),
      displayMedium: GoogleFonts.inter(color: display, fontWeight: FontWeight.w800, letterSpacing: -0.4),
      displaySmall:  GoogleFonts.inter(color: display, fontWeight: FontWeight.w800, letterSpacing: -0.3),
      headlineLarge: GoogleFonts.inter(color: display, fontWeight: FontWeight.w800),
      headlineMedium:GoogleFonts.inter(color: display, fontWeight: FontWeight.w700),
      headlineSmall: GoogleFonts.inter(color: display, fontWeight: FontWeight.w700),
      titleLarge:    GoogleFonts.inter(color: body,    fontWeight: FontWeight.w700),
      titleMedium:   GoogleFonts.inter(color: body,    fontWeight: FontWeight.w600),
      titleSmall:    GoogleFonts.inter(color: body,    fontWeight: FontWeight.w600),
      bodyLarge:     GoogleFonts.inter(color: body,    fontWeight: FontWeight.w400),
      bodyMedium:    GoogleFonts.inter(color: body,    fontWeight: FontWeight.w400),
      bodySmall:     GoogleFonts.inter(color: body.withValues(alpha: 0.65), fontWeight: FontWeight.w400),
      labelLarge:    GoogleFonts.inter(color: body,    fontWeight: FontWeight.w600, letterSpacing: 0.1),
      labelMedium:   GoogleFonts.inter(color: body,    fontWeight: FontWeight.w600, letterSpacing: 0.1),
      labelSmall:    GoogleFonts.inter(color: body.withValues(alpha: 0.65), fontWeight: FontWeight.w500, letterSpacing: 0.5),
    );
  }

  // ── Shared shape ──────────────────────────────────────────────────
  static OutlinedBorder _roundedRect(double r) =>
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(r));

  // ══════════════════════════════════════════════════════════════════
  //  LIGHT THEME
  // ══════════════════════════════════════════════════════════════════
  static ThemeData light = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.lightBg,

    colorScheme: const ColorScheme.light(
      primary:      AppColors.brand,
      onPrimary:    Colors.white,
      primaryContainer: Color(0xFFF3E8FF),
      onPrimaryContainer: AppColors.brandDark,
      secondary:    AppColors.accent,
      onSecondary:  Colors.white,
      tertiary:     AppColors.violet,
      surface:      AppColors.lightSurface,
      onSurface:    AppColors.lightText,
      surfaceContainerHighest: AppColors.lightSurfaceAlt,
      outline:      AppColors.lightBorder,
      error:        AppColors.danger,
      onError:      Colors.white,
    ),

    textTheme: _textTheme(AppColors.lightText, AppColors.lightText),

    // ── AppBar ──
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.lightSurface.withValues(alpha: 0.92),
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppColors.lightText,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      shadowColor: AppColors.brand.withValues(alpha: 0.1),
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: GoogleFonts.inter(
        color: AppColors.lightText,
        fontSize: 17,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
      iconTheme: const IconThemeData(color: AppColors.lightText, size: 22),
      actionsIconTheme: const IconThemeData(color: AppColors.lightText, size: 22),
    ),

    // ── Cards ──
    cardTheme: CardThemeData(
      color: AppColors.lightSurface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: AppColors.lightBorder, width: 1),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.hardEdge,
    ),

    // ── Input fields ──
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.lightSurfaceAlt,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      hintStyle: GoogleFonts.inter(color: AppColors.lightTextMuted, fontSize: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.lightBorder, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.brand, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger, width: 2),
      ),
    ),

    // ── Elevated buttons ──
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        disabledBackgroundColor: AppColors.lightBorder,
        disabledForegroundColor: AppColors.lightTextMuted,
        elevation: 0,
        shadowColor: Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        shape: _roundedRect(12),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
      ),
    ),

    // ── Outlined buttons ──
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.brand,
        side: const BorderSide(color: AppColors.lightBorder),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        shape: _roundedRect(12),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),

    // ── Text buttons ──
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.brand,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: _roundedRect(8),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),

    // ── FAB ──
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.brand,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: CircleBorder(),
    ),

    // ── Chip ──
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.lightSurfaceAlt,
      selectedColor: AppColors.brand.withValues(alpha: 0.15),
      labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
      side: const BorderSide(color: AppColors.lightBorder),
      shape: _roundedRect(20),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    ),

    // ── Bottom nav ──
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: AppColors.lightGlass,
      selectedItemColor: AppColors.brand,
      unselectedItemColor: AppColors.lightTextMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700),
      unselectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
    ),

    // ── NavigationBar (M3) ──
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.lightGlass,
      indicatorColor: AppColors.brand.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.brand);
        }
        return GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.lightTextMuted);
      }),
    ),

    // ── Divider ──
    dividerTheme: const DividerThemeData(
      color: AppColors.lightBorder,
      thickness: 1,
      space: 1,
    ),

    // ── ListTile ──
    listTileTheme: ListTileThemeData(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      shape: _roundedRect(12),
      tileColor: Colors.transparent,
    ),

    // ── Switch ──
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? AppColors.brand : Colors.white),
      trackColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? AppColors.brand.withValues(alpha: 0.4) : AppColors.lightBorder),
    ),

    // ── SnackBar ──
    snackBarTheme: SnackBarThemeData(
      backgroundColor: AppColors.lightText,
      contentTextStyle: GoogleFonts.inter(color: Colors.white, fontSize: 14),
      shape: _roundedRect(12),
      behavior: SnackBarBehavior.floating,
      insetPadding: const EdgeInsets.all(16),
    ),

    // ── Dialog ──
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.lightSurface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: _roundedRect(20),
      titleTextStyle: GoogleFonts.inter(color: AppColors.lightText, fontSize: 18, fontWeight: FontWeight.w800),
    ),

    // ── Tab bar ──
    tabBarTheme: TabBarThemeData(
      labelColor: AppColors.brand,
      unselectedLabelColor: AppColors.lightTextMuted,
      indicatorColor: AppColors.brand,
      indicatorSize: TabBarIndicatorSize.tab,
      labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
      unselectedLabelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
      dividerColor: AppColors.lightBorder,
    ),

    // ── Progress ──
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.brand,
      linearTrackColor: AppColors.lightBorder,
    ),

    // ── Radio ──
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? AppColors.brand : AppColors.lightBorder),
    ),

    // ── Dropdown ──
    dropdownMenuTheme: DropdownMenuThemeData(
      textStyle: GoogleFonts.inter(fontSize: 14),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.lightSurfaceAlt,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.lightBorder)),
      ),
    ),
  );

  // ══════════════════════════════════════════════════════════════════
  //  DARK THEME
  // ══════════════════════════════════════════════════════════════════
  static ThemeData dark = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.darkBg,

    colorScheme: ColorScheme.dark(
      primary:      AppColors.brand,
      onPrimary:    Colors.white,
      primaryContainer: AppColors.brand.withValues(alpha: 0.2),
      onPrimaryContainer: AppColors.brandLight,
      secondary:    AppColors.accent,
      onSecondary:  Colors.white,
      tertiary:     AppColors.violet,
      surface:      AppColors.darkSurface,
      onSurface:    AppColors.darkText,
      surfaceContainerHighest: AppColors.darkSurfaceAlt,
      outline:      AppColors.darkBorder,
      error:        AppColors.danger,
      onError:      Colors.white,
    ),

    textTheme: _textTheme(AppColors.darkText, AppColors.darkText),

    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.darkBg.withValues(alpha: 0.92),
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppColors.darkText,
      elevation: 0,
      scrolledUnderElevation: 0,
      shadowColor: Colors.transparent,
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: GoogleFonts.inter(
        color: AppColors.darkText,
        fontSize: 17,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
      iconTheme: const IconThemeData(color: AppColors.darkText, size: 22),
      actionsIconTheme: const IconThemeData(color: AppColors.darkText, size: 22),
    ),

    cardTheme: CardThemeData(
      color: AppColors.darkSurface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: AppColors.darkBorder, width: 1),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.hardEdge,
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.darkSurfaceAlt,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      hintStyle: GoogleFonts.inter(color: AppColors.darkTextMuted, fontSize: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkBorder)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkBorder, width: 1)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.brand, width: 2)),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.danger, width: 1.5)),
      focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.danger, width: 2)),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        disabledBackgroundColor: AppColors.darkSurfaceAlt,
        disabledForegroundColor: AppColors.darkTextMuted,
        elevation: 0,
        shadowColor: Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        shape: _roundedRect(12),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.brand,
        side: const BorderSide(color: AppColors.darkBorder),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        shape: _roundedRect(12),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.brand,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: _roundedRect(8),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),

    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.brand,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: CircleBorder(),
    ),

    chipTheme: ChipThemeData(
      backgroundColor: AppColors.darkSurfaceAlt,
      selectedColor: AppColors.brand.withValues(alpha: 0.25),
      labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
      side: const BorderSide(color: AppColors.darkBorder),
      shape: _roundedRect(20),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    ),

    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: AppColors.darkGlass,
      selectedItemColor: AppColors.brand,
      unselectedItemColor: AppColors.darkTextMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700),
      unselectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
    ),

    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.darkGlass,
      indicatorColor: AppColors.brand.withValues(alpha: 0.2),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.brand);
        }
        return GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.darkTextMuted);
      }),
    ),

    dividerTheme: const DividerThemeData(
      color: AppColors.darkBorder,
      thickness: 1,
      space: 1,
    ),

    listTileTheme: ListTileThemeData(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      shape: _roundedRect(12),
      tileColor: Colors.transparent,
    ),

    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? AppColors.brand : AppColors.darkTextMuted),
      trackColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? AppColors.brand.withValues(alpha: 0.4) : AppColors.darkSurfaceAlt),
    ),

    snackBarTheme: SnackBarThemeData(
      backgroundColor: AppColors.darkSurface,
      contentTextStyle: GoogleFonts.inter(color: AppColors.darkText, fontSize: 14),
      shape: _roundedRect(12),
      behavior: SnackBarBehavior.floating,
      insetPadding: const EdgeInsets.all(16),
    ),

    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.darkSurface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: _roundedRect(20),
      titleTextStyle: GoogleFonts.inter(color: AppColors.darkText, fontSize: 18, fontWeight: FontWeight.w800),
    ),

    tabBarTheme: TabBarThemeData(
      labelColor: AppColors.brand,
      unselectedLabelColor: AppColors.darkTextMuted,
      indicatorColor: AppColors.brand,
      indicatorSize: TabBarIndicatorSize.tab,
      labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
      unselectedLabelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
      dividerColor: AppColors.darkBorder,
    ),

    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.brand,
      linearTrackColor: AppColors.darkBorder,
    ),

    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? AppColors.brand : AppColors.darkBorder),
    ),
  );
}