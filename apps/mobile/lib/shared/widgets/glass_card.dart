import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// A glass-morphism card widget that adapts to light/dark mode
class GlassCard extends StatelessWidget {
  const GlassCard({
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius,
    this.blur = 12.0,
    this.opacity,
    this.borderColor,
    this.gradient,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? borderRadius;
  final double blur;
  final double? opacity;
  final Color? borderColor;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final r = borderRadius ?? 16.0;
    final defaultOpacity = opacity ?? (isDark ? 0.7 : 0.85);
    final defaultBg = isDark
        ? AppColors.darkSurface.withValues(alpha: defaultOpacity)
        : AppColors.lightSurface.withValues(alpha: defaultOpacity);
    final defaultBorder = borderColor ??
        (isDark
            ? AppColors.darkBorder.withValues(alpha: 0.5)
            : AppColors.lightBorder.withValues(alpha: 0.7));

    return Container(
      margin: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(r),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              gradient: gradient,
              color: gradient == null ? defaultBg : null,
              borderRadius: BorderRadius.circular(r),
              border: Border.all(color: defaultBorder, width: 1),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Brand gradient card with glow
class BrandGradientCard extends StatelessWidget {
  const BrandGradientCard({
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? borderRadius;

  @override
  Widget build(BuildContext context) {
    final r = borderRadius ?? 18.0;
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0x18CB26E4), Color(0x08CB26E4)],
        ),
        borderRadius: BorderRadius.circular(r),
        border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
      ),
      child: child,
    );
  }
}

/// Stat pill widget used across dashboards
class StatPill extends StatelessWidget {
  const StatPill({
    required this.label,
    required this.value,
    required this.color,
    this.icon,
    this.onTap,
    super.key,
  });

  final String label;
  final String value;
  final Color color;
  final IconData? icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: color, width: 3)),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.08), blurRadius: 8)],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
            ],
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color, height: 1.1)),
                Text(label, style: TextStyle(fontSize: 9, color: color.withValues(alpha: 0.7), fontWeight: FontWeight.w700, letterSpacing: 0.3)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Responsive layout helper
class ResponsiveLayout extends StatelessWidget {
  const ResponsiveLayout({
    required this.mobile,
    this.tablet,
    this.desktop,
    super.key,
  });

  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;

  static bool isMobile(BuildContext context) => MediaQuery.of(context).size.width < 600;
  static bool isTablet(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    return w >= 600 && w < 900;
  }
  static bool isDesktop(BuildContext context) => MediaQuery.of(context).size.width >= 900;

  static double contentPadding(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w >= 900) return 24;
    if (w >= 600) return 20;
    return 14;
  }

  static double maxWidth(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w >= 900) return 1100;
    if (w >= 600) return 800;
    return w;
  }

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w >= 900 && desktop != null) return desktop!;
    if (w >= 600 && tablet != null) return tablet!;
    return mobile;
  }
}