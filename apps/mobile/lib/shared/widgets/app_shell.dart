import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../features/auth/providers/auth_provider.dart';

class AppShell extends ConsumerWidget {
  const AppShell({required this.child, super.key});
  final Widget child;

  static const _desktopBreakpoint = 900.0;
  static const _tabletBreakpoint  = 600.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final w = MediaQuery.of(context).size.width;
    final user = ref.watch(currentUserProvider);
    final location = GoRouterState.of(context).uri.path;
    final isTeacher = user?.isTeacher ?? false;
    final isAdmin = user?.isAdmin ?? false;
    final navItems = _navItemsFor(isTeacher, isAdmin);

    final selectedIndex = navItems.indexWhere(
      (i) => location == i.path || (i.path != '/' && location.startsWith('${i.path}/')),
    );
    final sel = selectedIndex < 0 ? 0 : selectedIndex;

    // ── Desktop: full sidebar ──
    if (w >= _desktopBreakpoint) {
      return Scaffold(
        body: Row(
          children: [
            _DesktopSidebar(items: navItems, selectedIndex: sel, onTap: (i) => context.go(navItems[i].path), user: user),
            const VerticalDivider(width: 1),
            Expanded(child: child),
          ],
        ),
      );
    }

    // ── Tablet: compact sidebar ──
    if (w >= _tabletBreakpoint) {
      return Scaffold(
        body: Row(
          children: [
            _CompactSidebar(items: navItems, selectedIndex: sel, onTap: (i) => context.go(navItems[i].path)),
            const VerticalDivider(width: 1),
            Expanded(child: child),
          ],
        ),
      );
    }

    // ── Mobile: glass bottom nav ──
    return Scaffold(
      extendBody: true,
      body: child,
      bottomNavigationBar: _GlassBottomNav(
        items: navItems.take(5).toList(),
        selectedIndex: sel.clamp(0, 4),
        onTap: (i) => context.go(navItems[i].path),
      ),
    );
  }

  List<_NavItem> _navItemsFor(bool isTeacher, bool isAdmin) => [
    const _NavItem('/',              'Home',    Icons.home_outlined,          Icons.home_rounded),
    const _NavItem('/classes',       'Classes', Icons.class_outlined,          Icons.class_rounded),
    const _NavItem('/discover',      'Discover',Icons.explore_outlined,        Icons.explore_rounded),
    const _NavItem('/messages',      'Messages',Icons.chat_bubble_outline,     Icons.chat_bubble_rounded),
    const _NavItem('/profile',       'Profile', Icons.person_outline,          Icons.person_rounded),
    const _NavItem('/lessons',       'Lessons', Icons.menu_book_outlined,      Icons.menu_book_rounded),
    const _NavItem('/quizzes',       'Quizzes', Icons.quiz_outlined,           Icons.quiz_rounded),
    const _NavItem('/live-sessions', 'Live',    Icons.live_tv_outlined,        Icons.live_tv_rounded),
    const _NavItem('/notifications', 'Alerts',  Icons.notifications_outlined,  Icons.notifications_rounded),
    const _NavItem('/dashboard',     'Dashboard',Icons.dashboard_outlined,     Icons.dashboard_rounded),
  ];
}

// ── Glass Bottom Nav ──────────────────────────────────────────────
class _GlassBottomNav extends StatelessWidget {
  const _GlassBottomNav({required this.items, required this.selectedIndex, required this.onTap});
  final List<_NavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final safe = MediaQuery.of(context).padding.bottom;

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 60 + safe,
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.darkSurface.withValues(alpha: 0.85)
                : AppColors.lightSurface.withValues(alpha: 0.88),
            border: Border(
              top: BorderSide(
                color: isDark
                    ? AppColors.darkBorder.withValues(alpha: 0.6)
                    : AppColors.lightBorder.withValues(alpha: 0.8),
                width: 0.5,
              ),
            ),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: items.asMap().entries.map((e) {
                final i = e.key;
                final item = e.value;
                final selected = i == selectedIndex;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => onTap(i),
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Icon with pill indicator
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            decoration: BoxDecoration(
                              color: selected ? AppColors.brand.withValues(alpha: 0.12) : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Icon(
                              selected ? item.activeIcon : item.icon,
                              size: 22,
                              color: selected ? AppColors.brand : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                            ),
                          ),
                          const SizedBox(height: 2),
                          AnimatedDefaultTextStyle(
                            duration: const Duration(milliseconds: 200),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                              color: selected ? AppColors.brand : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                            ),
                            child: Text(item.label, maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Desktop Sidebar ───────────────────────────────────────────────
class _DesktopSidebar extends ConsumerWidget {
  const _DesktopSidebar({required this.items, required this.selectedIndex, required this.onTap, required this.user});
  final List<_NavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onTap;
  final dynamic user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      width: 240,
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface.withValues(alpha: 0.95) : AppColors.lightSurface.withValues(alpha: 0.97),
            ),
            child: Column(
              children: [
                // Logo
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: Row(
                    children: [
                      Container(
                        width: 34, height: 34,
                        decoration: BoxDecoration(
                          gradient: AppColors.brandGradient,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [BoxShadow(color: AppColors.brandGlow, blurRadius: 12, offset: const Offset(0, 4))],
                        ),
                        child: const Icon(Icons.school_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Text('Learnex', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: isDark ? AppColors.darkText : AppColors.lightText)),
                    ],
                  ),
                ),

                Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                const SizedBox(height: 8),

                // Nav items
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    itemCount: items.length,
                    itemBuilder: (_, i) {
                      final item = items[i];
                      final selected = i == selectedIndex;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 1),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          decoration: BoxDecoration(
                            color: selected ? AppColors.brand.withValues(alpha: 0.1) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: ListTile(
                            dense: true,
                            leading: Icon(
                              selected ? item.activeIcon : item.icon,
                              color: selected ? AppColors.brand : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                              size: 20,
                            ),
                            title: Text(
                              item.label,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                                color: selected ? AppColors.brand : (isDark ? AppColors.darkText : AppColors.lightText),
                              ),
                            ),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            onTap: () => onTap(i),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // User card at bottom
                if (user != null) ...[
                  Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceAlt : AppColors.lightSurfaceAlt,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(
                              gradient: AppColors.brandGradient,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                (user.fullName?.isNotEmpty == true ? user.fullName[0] : '?').toUpperCase(),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user.fullName ?? 'User', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: isDark ? AppColors.darkText : AppColors.lightText), overflow: TextOverflow.ellipsis),
                                Text(user.role.label, style: const TextStyle(fontSize: 11, color: AppColors.brand, fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(Icons.logout_rounded, size: 16, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                            onPressed: () => ref.read(authProvider.notifier).logout(),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Compact Sidebar (tablet) ──────────────────────────────────────
class _CompactSidebar extends StatelessWidget {
  const _CompactSidebar({required this.items, required this.selectedIndex, required this.onTap});
  final List<_NavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      width: 72,
      child: Container(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        child: Column(
          children: [
            const SizedBox(height: 16),
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(gradient: AppColors.brandGradient, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.school_rounded, color: Colors.white, size: 22),
            ),
            const SizedBox(height: 12),
            Divider(height: 1, color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: items.length,
                itemBuilder: (_, i) {
                  final selected = i == selectedIndex;
                  return Tooltip(
                    message: items[i].label,
                    child: GestureDetector(
                      onTap: () => onTap(i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: selected ? AppColors.brand.withValues(alpha: 0.12) : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          selected ? items[i].activeIcon : items[i].icon,
                          color: selected ? AppColors.brand : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                          size: 22,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Nav Item model ────────────────────────────────────────────────
class _NavItem {
  const _NavItem(this.path, this.label, this.icon, this.activeIcon);
  final String path;
  final String label;
  final IconData icon;
  final IconData activeIcon;
}