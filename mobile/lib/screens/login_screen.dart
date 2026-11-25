import 'package:flutter/material.dart';

import '../api/ethio_api.dart';
import '../theme/ethio_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onAuthenticated});

  final VoidCallback onAuthenticated;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController(text: '+251911000001');
  final _otpController = TextEditingController();
  bool _otpSent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await EthioApi.instance.verifyPhone(_phoneController.text.trim());
      if (result['linked'] != true) {
        throw EthioApiException('connect your phone to fyd');
      }
      setState(() {
        _otpSent = true;
      });
    } catch (e) {
      final msg = e.toString();
      setState(() => _error = msg.contains('connect your phone to fyd') ? 'connect your phone to fyd' : msg);
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await EthioApi.instance.confirmPhone(
        phoneNumber: _phoneController.text.trim(),
        otp: _otpController.text.trim(),
      );
      widget.onAuthenticated();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [ethioForest, ethioGreen, Color(0xFF2DD4BF)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 108,
                        height: 108,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.18),
                              blurRadius: 24,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: Image.asset(
                            'assets/images/ethioalert_logo.jpg',
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'EthioAlert',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.4,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Citizen safety alerts and SOS for Ethiopia',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.88),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.16),
                            blurRadius: 30,
                            offset: const Offset(0, 18),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            _otpSent ? 'Enter verification code' : 'Sign in with mobile',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: ethioInk,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _otpSent
                                ? 'We sent a 6-digit SMS verification code to your phone.'
                                : 'Enter your Ethiopian mobile number (09…, 07…, or +251…).',
                            style: const TextStyle(color: ethioMuted, fontSize: 13, height: 1.4),
                          ),
                          const SizedBox(height: 18),
                          TextField(
                            controller: _phoneController,
                            enabled: !_otpSent,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Mobile number',
                              hintText: '09… / 07… / +251…',
                              prefixIcon: Icon(Icons.phone_iphone_rounded),
                            ),
                          ),
                          if (_otpSent) ...[
                            const SizedBox(height: 12),
                            TextField(
                              controller: _otpController,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              decoration: const InputDecoration(
                                labelText: 'OTP code',
                                counterText: '',
                                prefixIcon: Icon(Icons.lock_rounded),
                              ),
                            ),
                          ],
                          if (_error != null) ...[
                            const SizedBox(height: 10),
                            Text(_error!, style: const TextStyle(color: ethioDanger, fontSize: 12)),
                          ],
                          const SizedBox(height: 18),
                          FilledButton(
                            onPressed: _busy ? null : (_otpSent ? _confirm : _sendOtp),
                            child: Text(
                              _busy
                                  ? 'Please wait…'
                                  : _otpSent
                                      ? 'Verify & continue'
                                      : 'Send SMS code',
                            ),
                          ),
                          if (_otpSent)
                            TextButton(
                              onPressed: _busy
                                  ? null
                                  : () => setState(() {
                                        _otpSent = false;
                                        _otpController.clear();
                                      }),
                              child: const Text('Use a different number'),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
