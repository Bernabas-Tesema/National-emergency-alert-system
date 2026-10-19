import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../application/auth_controller.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _controller = TextEditingController();
  Timer? _timer;
  int _secondsLeft = 0;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final seconds =
        ref.read(loginFlowProvider)?.challenge?.resendAfterSeconds ?? 30;
    _startTimer(seconds);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _startTimer(int seconds) {
    _timer?.cancel();
    _secondsLeft = seconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() => _secondsLeft--);
      if (_secondsLeft <= 0) t.cancel();
    });
  }

  Future<void> _confirm() async {
    final challenge = ref.read(loginFlowProvider)?.challenge;
    if (challenge == null) return;
    final code = _controller.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final citizen = await ref
          .read(authRepositoryProvider)
          .confirmOtp(challengeId: challenge.challengeId, code: code);
      ref.read(loginFlowProvider.notifier).clear();
      // The router notices the new state and opens Home by itself.
      ref.read(authControllerProvider.notifier).markSignedIn(citizen);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.code == 'OTP_INVALID'
            ? 'That code is not correct. Check the SMS and try again.'
            : e.message;
      });
    }
  }

  Future<void> _resend() async {
    final flow = ref.read(loginFlowProvider);
    if (flow == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final challenge =
          await ref.read(authRepositoryProvider).requestOtp(flow.phone);
      ref.read(loginFlowProvider.notifier).updateChallenge(challenge);
      if (!mounted) return;
      _controller.clear();
      _startTimer(challenge.resendAfterSeconds);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.code == 'RATE_LIMITED'
            ? 'Too many tries. Please wait ${e.retryAfterSeconds ?? 60} seconds.'
            : e.message;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _changeNumber() {
    ref.read(loginFlowProvider.notifier).clear();
    context.go('/phone');
  }

  @override
  Widget build(BuildContext context) {
    final phone = ref.watch(loginFlowProvider)?.phone ?? '';
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: _changeNumber),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Enter the code',
                      style:
                          TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('We sent a 6-digit code to $phone.',
                      style: const TextStyle(color: AppColors.textMuted)),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _controller,
                    autofocus: true,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    style: const TextStyle(fontSize: 28, letterSpacing: 8),
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(6),
                    ],
                    decoration: InputDecoration(
                      border: const OutlineInputBorder(),
                      errorText: _error,
                    ),
                    onChanged: (value) {
                      if (value.length == 6 && !_loading) _confirm();
                    },
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _loading ? null : _confirm,
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Confirm'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: (_secondsLeft > 0 || _loading) ? null : _resend,
                    child: Text(_secondsLeft > 0
                        ? 'Resend code in $_secondsLeft s'
                        : 'Resend code'),
                  ),
                  TextButton(
                    onPressed: _changeNumber,
                    child: const Text('Use a different number'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}