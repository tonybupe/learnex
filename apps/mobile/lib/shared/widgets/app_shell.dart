import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../features/auth/providers/auth_provider.dart';

class AppShell extends ConsumerWidget {
  const AppShell({required this.child, super.key});
  final Widget child;

  static const _mobileBreakpoint = 768.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final isWide = width >= _mobileBreakpoint;
    final user = ref.watch(currentUserProvider);
    final location = GoRouterState.of(context).uri.path;
    final navItems = _navItemsFor(user?.isTeacher ?? false);
    final selectedIndex = navItems.indexWhere(
      (i) => location == i.path || location.startsWith('${i.path}/'),
    );

    if (isWide) {
      return Scaffold(
        body: Row(
          children: [
            _Sidebar(
              items: navItems,
              selectedIndex: selectedIndex < 0 ? 0 : selectedIndex,
              onTap: (i) => context.go(navItems[i].path),
            ),
            const VerticalDivider(width: 1),
            Expanded(child: child),
          ],
        ),
      );
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: selectedIndex < 0 ? 0 : selectedIndex.clamp(0, 4),
        onTap: (i) => context.go(navItems[i].path),
        items: navItems
            .take(5)
            .map((i) => BottomNavigationBarItem(
                  icon: Icon(i.icon),
                  activeIcon: Icon(i.activeIcon),
                  label: i.label,
                ))
            .toList(),
      ),
    );
  }

  List<_NavItem> _navItemsFor(bool isTeacher) {
    return [
      const _NavItem('/', 'Home', Icons.home_outlined, Icons.home),
      const _NavItem('/classes', 'Classes', Icons.class_outlined, Icons.class_),
      const _NavItem(
          '/discover', 'Discover', Icons.explore_outlined, Icons.explore),
      const _NavItem('/messages', 'Messages',
          Icons.chat_bubble_outline, Icons.chat_bubble),
      const _NavItem(
          '/profile', 'Profile', Icons.person_outline, Icons.person),
      // Extra items only visible in sidebar
      const _NavItem('/lessons', 'Lessons', Icons.menu_book_outlined,
          Icons.menu_book),
      const _NavItem('/quizzes', 'Quizzes', Icons.quiz_outlined, Icons.quiz),
      const _NavItem('/live-sessions', 'Live', Icons.live_tv_outlined,
          Icons.live_tv),
      const _NavItem('/notifications', 'Notifications',
          Icons.notifications_outlined, Icons.notifications),
      const _NavItem('/dashboard', 'Dashboard',
          Icons.dashboard_outlined, Icons.dashboard),
    ];
  }
}

class _NavItem {
  const _NavItem(this.path, this.label, this.icon, this.activeIcon);
  final String path;
  final String label;
  final IconData icon;
  final IconData activeIcon;
}

class _Sidebar extends ConsumerWidget {
  const _Sidebar({
    required this.items,
    required this.selectedIndex,
    required this.onTap,
  });

  final List<_NavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return SizedBox(
      width: 240,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.brand, AppColors.brandDark],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.school, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                Text(
                  'Learnex',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: items.length,
              itemBuilder: (ctx, i) {
                final item = items[i];
                final selected = i == selectedIndex;
                return Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  child: ListTile(
                    leading: Icon(
                      selected ? item.activeIcon : item.icon,
                      color: selected ? AppColors.brand : null,
                    ),
                    title: Text(
                      item.label,
                      style: TextStyle(
                        fontWeight:
                            selected ? FontWeight.w600 : FontWeight.normal,
                        color: selected ? AppColors.brand : null,
                      ),
                    ),
                    selected: selected,
                    selectedTileColor: AppColors.brand.withValues(alpha: 0.08),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    onTap: () => onTap(i),
                  ),
                );
              },
            ),
          ),
          if (user != null) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.brand.withValues(alpha: 0.1),
                  backgroundImage: user.avatarUrl != null
                      ? NetworkImage(user.avatarUrl!)
                      : null,
                  child: user.avatarUrl == null
                      ? Text(
                          user.fullName.isNotEmpty
                              ? user.fullName[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                            color: AppColors.brand,
                            fontWeight: FontWeight.w600,
                          ),
                        )
                      : null,
                ),
                title: Text(
                  user.fullName,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  user.role.label,
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: () =>
                      ref.read(authProvider.notifier).logout(),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
