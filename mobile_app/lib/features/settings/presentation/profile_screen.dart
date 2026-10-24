import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_controller.dart';
import '../../auth/domain/phone_number.dart';
import '../application/settings_controller.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final TextEditingController _name;
  late final TextEditingController _contact;
  String? _contactError;

  @override
  void initState() {
    super.initState();
    final saved = ref.read(settingsProvider);
    _name = TextEditingController(text: saved.displayName);
    _contact = TextEditingController(text: saved.emergencyContact);
  }

  @override
  void dispose() {
    _name.dispose();
    _contact.dispose();
    super.dispose();
  }

  void _save() {
    final text = _contact.text.trim();
    var contact = '';
    if (text.isNotEmpty) {
      final normalized = normalizeEthiopianPhone(text);
      if (normalized == null) {
        setState(() => _contactError = 'Enter a valid Ethiopian mobile number.');
        return;
      }
      contact = normalized;
    }
    setState(() => _contactError = null);
    _contact.text = contact;
    ref
        .read(settingsProvider.notifier)
        .saveProfile(name: _name.text.trim(), contact: contact);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile saved for this session.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final controller = ref.read(settingsProvider.notifier);
    final citizen = ref.watch(authControllerProvider).citizen;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile & settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.phone_outlined),
                    title: const Text('Phone number'),
                    subtitle: Text(citizen?.phone ?? ''),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Display name',
                      prefixIcon: Icon(Icons.person_outline),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _contact,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: 'Emergency contact',
                      prefixIcon: const Icon(Icons.contact_phone_outlined),
                      border: const OutlineInputBorder(),
                      errorText: _contactError,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _save,
                      icon: const Icon(Icons.save_outlined),
                      label: const Text('Save profile'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Preferences',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: DropdownButtonFormField<String>(
                    initialValue: settings.languageCode,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Language',
                      prefixIcon: Icon(Icons.language_outlined),
                      border: OutlineInputBorder(),
                      helperText: 'Saved for this session. Translations are '
                          'not connected yet.',
                      helperMaxLines: 2,
                    ),
                    items: [
                      for (final l in appLanguages)
                        DropdownMenuItem(
                          value: l.code,
                          child: Text(l.name == l.nativeName
                              ? l.name
                              : '${l.name} (${l.nativeName})'),
                        ),
                    ],
                    onChanged: (v) {
                      if (v != null) controller.setLanguage(v);
                    },
                  ),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.notifications_outlined),
                  title: const Text('Notifications'),
                  subtitle: const Text(
                      'Preference only for now. Push settings are not connected.'),
                  value: settings.notifications,
                  onChanged: controller.setNotifications,
                ),
                const Divider(height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.data_saver_on_outlined),
                  title: const Text('Low-bandwidth mode'),
                  subtitle: const Text(
                      'Preference only for now. Network savings are not connected.'),
                  value: settings.lowBandwidth,
                  onChanged: controller.setLowBandwidth,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () =>
                ref.read(authControllerProvider.notifier).signOut(),
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}