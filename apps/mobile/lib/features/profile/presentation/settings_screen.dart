import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_provider.dart';
import '../../auth/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const _SectionHeader(label: 'Appearance'),
          _ThemeTile(
            title: 'System default',
            value: ThemeMode.system,
            groupValue: themeMode,
            onChanged: (v) => ref.read(themeProvider.notifier).setMode(v),
          ),
          _ThemeTile(
            title: 'Light',
            value: ThemeMode.light,
            groupValue: themeMode,
            onChanged: (v) => ref.read(themeProvider.notifier).setMode(v),
          ),
          _ThemeTile(
            title: 'Dark',
            value: ThemeMode.dark,
            groupValue: themeMode,
            onChanged: (v) => ref.read(themeProvider.notifier).setMode(v),
          ),
          const Divider(),
          const _SectionHeader(label: 'Notifications'),
          SwitchListTile(
            title: const Text('Push notifications'),
            subtitle: const Text('Get notified about new content'),
            value: true,
            activeColor: AppColors.brand,
            onChanged: (_) {},
          ),
          SwitchListTile(
            title: const Text('Class updates'),
            subtitle: const Text('New lessons and quizzes'),
            value: true,
            activeColor: AppColors.brand,
            onChanged: (_) {},
          ),
          SwitchListTile(
            title: const Text('Messages'),
            subtitle: const Text('New direct messages'),
            value: true,
            activeColor: AppColors.brand,
            onChanged: (_) {},
          ),
          const Divider(),
          const _SectionHeader(label: 'About'),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Privacy Policy'),
            trailing: const Icon(Icons.open_in_new, size: 16),
            onTap: () => launchUrl(Uri.parse('https://www.learn-ex.online/privacy')),
          ),
          ListTile(
            leading: const Icon(Icons.description_outlined),
            title: const Text('Terms of Service'),
            trailing: const Icon(Icons.open_in_new, size: 16),
            onTap: () => launchUrl(Uri.parse('https://www.learn-ex.online/terms')),
          ),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('Help & Support'),
            trailing: const Icon(Icons.open_in_new, size: 16),
            onTap: () => launchUrl(Uri.parse('https://www.learn-ex.online')),
          ),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Version'),
            trailing: Text('0.1.0', style: TextStyle(color: Colors.grey)),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.danger),
            title: const Text(
              'Log out',
              style: TextStyle(color: AppColors.danger),
            ),
            onTap: () => ref.read(authProvider.notifier).logout(),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile({
    required this.title,
    required this.value,
    required this.groupValue,
    required this.onChanged,
  });

  final String title;
  final ThemeMode value;
  final ThemeMode groupValue;
  final void Function(ThemeMode) onChanged;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(title),
      leading: Radio<ThemeMode>(
        value: value,
        groupValue: groupValue,
        activeColor: AppColors.brand,
        onChanged: (v) { if (v != null) onChanged(v); },
      ),
      onTap: () => onChanged(value),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).textTheme.bodySmall?.color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}