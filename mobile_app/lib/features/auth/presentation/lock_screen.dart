import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../application/auth_controller.dart';

class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    // Ask right away, after the first frame is drawn.
    WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
  }

  Future<void> _unlock() async {
    final ok = await ref.read(authControllerProvider.notifier).unlock();
    if (!ok && mounted) setState(() => _failed = true);
    // On success the router moves to Home by itself.
  }

  @override
  Widget build(BuildContext context) {
    final phone = ref.watch(authControllerProvider).citizen?.phone ?? '';
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.lock_outline, size: 64),
                  const SizedBox(height: 16),
                  const Text('Unlock to continue',
                      textAlign: TextAlign.center,
                      style:
                          TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(phone,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textMuted)),
                  if (_failed) ...[
                    const SizedBox(height: 16),
                    const Text('Could not unlock. Try again.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.error)),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _unlock,
                    child: const Text('Unlock'),
                  ),
                  TextButton(
                    onPressed: () =>
                        ref.read(authControllerProvider.notifier).signOut(),
                    child: const Text('Use an SMS code instead'),
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