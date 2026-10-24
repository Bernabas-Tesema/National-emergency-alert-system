import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/severity.dart';
import '../alerts/presentation/home_screen.dart';
import '../guide/presentation/safety_guide_screen.dart';
import '../reports/presentation/reports_screen.dart';
import '../settings/presentation/profile_screen.dart';
import 'shell_index.dart';

/// The signed-in app: one bottom bar with four sections and an SOS button.
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key});

  static const _tabs = <Widget>[
    HomeScreen(),
    ReportsScreen(),
    SafetyGuideScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tab = ref.watch(shellIndexProvider);
    // The bar has five buttons. SOS (the third) opens the form, not a section.
    final selected = tab < 2 ? tab : tab + 1;

    return Scaffold(
      body: IndexedStack(index: tab, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected,
        onDestinationSelected: (d) {
          if (d == 2) {
            context.push('/sos');
            return;
          }
          ref.read(shellIndexProvider.notifier).select(d < 2 ? d : d - 1);
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
          const NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined),
            selectedIcon: Icon(Icons.confirmation_number),
            label: 'My reports',
          ),
          NavigationDestination(
            icon: Icon(Icons.sos, color: Severity.critical.color),
            selectedIcon: Icon(Icons.sos, color: Severity.critical.color),
            label: 'SOS',
            tooltip: 'Report an emergency (SOS)',
          ),
          const NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Safety guide',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}