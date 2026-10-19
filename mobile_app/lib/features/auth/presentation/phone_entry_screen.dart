import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../application/auth_controller.dart';
import '../domain/phone_number.dart';

class PhoneEntryScreen extends ConsumerStatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  ConsumerState<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends ConsumerState<PhoneEntryScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final phone = normalizeEthiopianPhone(_controller.text);
    if (phone == null) {
      setState(() => _error = 'Enter a valid Ethiopian mobile number.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final flow = ref.read(loginFlowProvider.notifier);
    try {
      final challenge = await ref.read(authRepositoryProvider).requestOtp(phone);
      flow.start(phone, challenge);
      if (mounted) context.go('/otp');
    } on ApiException catch (e) {
      flow.setPhone(phone);
      if (!mounted) return;
      if (e.code == 'NUMBER_NOT_LINKED') {
        context.go('/not-linked');
        return;
      }
      setState(() {
        _error = e.code == 'RATE_LIMITED'
            ? 'Too many tries. Please wait ${e.retryAfterSeconds ?? 60} seconds and try again.'
            : e.message;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Sign in',
                      style:
                          TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text(
                    'Enter the phone number linked to your Fayda ID. '
                    'We will send you a code by SMS.',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 24),
                  if (ref.watch(authControllerProvider).notice != null) ...[
  Text(
    ref.watch(authControllerProvider).notice!,
    style: const TextStyle(color: AppColors.warning),
  ),
  const SizedBox(height: 16),
],
                  TextField(
                    controller: _controller,
                    keyboardType: TextInputType.phone,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s]')),
                    ],
                    decoration: InputDecoration(
                      labelText: 'Phone number',
                      hintText: '0911 000 201',
                      border: const OutlineInputBorder(),
                      errorText: _error,
                    ),
                    onSubmitted: (_) => _loading ? null : _submit(),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Send code'),
                  ),
                  if (AppConfig.useMock) ...[
                    const SizedBox(height: 32),
                    const Text(
                      'Test mode numbers:\n'
                      '+251911000201  linked (code 123456)\n'
                      '+251911000202  not linked\n'
                      '+251911000203  rate-limited',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textMuted),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}