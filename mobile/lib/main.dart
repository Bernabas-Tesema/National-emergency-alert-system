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
    await EthioApi.instance.loadSession();
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
              colors: [ethioForest, ethioGreen],
            ),
          ),
          child: const Center(
            child: CircularProgressIndicator(color: Colors.white),
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
