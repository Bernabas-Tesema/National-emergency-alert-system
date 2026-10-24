import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/alerts/presentation/alert_detail_screen.dart';
import '../../features/alerts/presentation/alert_history_screen.dart';
import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/presentation/lock_screen.dart';
import '../../features/auth/presentation/not_linked_screen.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/phone_entry_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/shell/home_shell.dart';
import '../../features/sos/presentation/sos_report_screen.dart';
import '../../features/sos/presentation/sos_screen.dart';

const _loginRoutes = {'/phone', '/otp', '/not-linked'};

final routerProvider = Provider<GoRouter>((ref) {
  // Tells the router to re-check its rules whenever the login state changes.
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  final router = GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final location = state.matchedLocation;

      switch (auth.status) {
        case AuthStatus.unknown:
          return location == '/splash' ? null : '/splash';
        case AuthStatus.locked:
          return location == '/lock' ? null : '/lock';
        case AuthStatus.signedIn:
          final isEntry = location == '/splash' ||
              location == '/lock' ||
              _loginRoutes.contains(location);
          return isEntry ? '/home' : null;
        case AuthStatus.signedOut:
          if (!_loginRoutes.contains(location)) return '/phone';
          if (location == '/otp' &&
              ref.read(loginFlowProvider)?.challenge == null) {
            return '/phone';
          }
          return null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/phone', builder: (_, _) => const PhoneEntryScreen()),
      GoRoute(path: '/otp', builder: (_, _) => const OtpScreen()),
      GoRoute(path: '/not-linked', builder: (_, _) => const NotLinkedScreen()),
      GoRoute(path: '/lock', builder: (_, _) => const LockScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeShell()),
      GoRoute(path: '/history', builder: (_, _) => const AlertHistoryScreen()),
      GoRoute(
        path: '/alerts/:id',
        builder: (_, state) =>
            AlertDetailScreen(alertId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/sos', builder: (_, _) => const SosScreen()),
      GoRoute(
        path: '/reports/:id',
        builder: (_, state) =>
            SosReportScreen(reportId: state.pathParameters['id']!),
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});