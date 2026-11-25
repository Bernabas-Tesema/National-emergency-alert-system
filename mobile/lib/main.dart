import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api/ethio_api.dart';
import 'screens/home_shell.dart';
import 'screens/intro_screen.dart';
import 'screens/login_screen.dart';
import 'theme/ethio_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EthioAlertApp());
}

class EthioAlertApp extends StatelessWidget {
  const EthioAlertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EthioAlert',
      debugShowCheckedModeBanner: false,
      theme: buildEthioTheme(),
      home: const _Bootstrap(),
    );
  }
}

class _Bootstrap extends StatefulWidget {
  const _Bootstrap();

  @override
  State<_Bootstrap> createState() => _BootstrapState();
}

class _BootstrapState extends State<_Bootstrap> {
  bool _ready = false;
  bool _introSeen = false;
  bool _signedIn = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      EthioApi.instance.loadSession(),
      Future.delayed(const Duration(milliseconds: 1400)),
    ]);
    if (!mounted) return;
    setState(() {
      _introSeen = prefs.getBool(introSeenKey) ?? false;
      _signedIn = EthioApi.instance.accessToken != null;
      _ready = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [ethioForest, ethioGreen, Color(0xFF14B8A6)],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                const Spacer(),
                Center(
                  child: Container(
                    width: 132,
                    height: 132,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.22),
                          blurRadius: 28,
                          offset: const Offset(0, 12),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.asset(
                        'assets/images/ethioalert_logo.jpg',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'EthioAlert',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Stay Informed. Stay Safe.',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.88),
                    letterSpacing: 0.4,
                  ),
                ),
                const Spacer(),
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'NATIONAL EMERGENCY SYSTEM',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.white.withValues(alpha: 0.78),
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 28),
              ],
            ),
          ),
        ),
      );
    }
    if (!_introSeen) {
      return IntroScreen(onFinished: () => setState(() => _introSeen = true));
    }
    if (!_signedIn) {
      return LoginScreen(onAuthenticated: () => setState(() => _signedIn = true));
    }
    return HomeShell(onSignedOut: () => setState(() => _signedIn = false));
  }
}
