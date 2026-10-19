import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/device/device_binding.dart';
import '../../../core/network/api_client.dart';
import '../data/auth_repository.dart';
import '../data/biometric_service.dart';
import '../domain/citizen.dart';

enum AuthStatus { unknown, signedOut, locked, signedIn }

class AuthState {
  const AuthState(this.status, [this.citizen, this.notice]);
  final AuthStatus status;
  final Citizen? citizen;

  /// A message for the login screen, e.g. "new device, verify again".
  final String? notice;
}

final deviceBindingProvider = Provider<DeviceBinding>(
  (ref) => DeviceBinding(ref.watch(tokenStorageProvider)),
);

final biometricServiceProvider =
    Provider<BiometricService>((ref) => BiometricService());

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(dioProvider),
    ref.watch(tokenStorageProvider),
    ref.watch(deviceBindingProvider),
  ),
);

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    // If the token refresh fails anywhere in the app, sign the user out.
    final expired = ref.watch(sessionEventsProvider).expired;
    expired.addListener(_onExpired);
    ref.onDispose(() => expired.removeListener(_onExpired));

    _restore();
    return const AuthState(AuthStatus.unknown);
  }

  Future<void> _restore() async {
    final repo = ref.read(authRepositoryProvider);
    final binding = ref.read(deviceBindingProvider);
    final storage = ref.read(tokenStorageProvider);

    final citizen = await repo.restore();
    await Future<void>.delayed(const Duration(milliseconds: 900)); // splash

    if (citizen == null) {
      state = const AuthState(AuthStatus.signedOut);
      return;
    }
    if (await binding.hasChanged()) {
      await repo.signOut();
      await binding.rememberCurrent();
      state = const AuthState(
        AuthStatus.signedOut,
        null,
        'This looks like a new device. Please verify your number again.',
      );
      return;
    }
    state = await storage.readBiometricEnabled()
        ? AuthState(AuthStatus.locked, citizen)
        : AuthState(AuthStatus.signedIn, citizen);
  }

  Future<void> markSignedIn(Citizen citizen) async {
    await ref.read(deviceBindingProvider).rememberCurrent();
    state = AuthState(AuthStatus.signedIn, citizen);
  }

  /// Shows the system prompt. On success the app opens.
  Future<bool> unlock() async {
    final ok = await ref
        .read(biometricServiceProvider)
        .authenticate('Unlock National Emergency Alert');
    if (ok && state.status == AuthStatus.locked) {
      state = AuthState(AuthStatus.signedIn, state.citizen);
    }
    return ok;
  }

  /// Confirms with the system prompt first, then turns unlock on.
  Future<bool> enableBiometric() async {
    final ok = await ref
        .read(biometricServiceProvider)
        .authenticate('Confirm to turn on quick unlock');
    if (ok) await ref.read(tokenStorageProvider).saveBiometricEnabled(true);
    return ok;
  }

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    state = const AuthState(AuthStatus.signedOut);
  }

  void _onExpired() {
    if (state.status == AuthStatus.signedIn ||
        state.status == AuthStatus.locked) {
      signOut();
    }
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

/// What the login screens share while a login is in progress.
class LoginFlowState {
  const LoginFlowState({required this.phone, this.challenge});
  final String phone;
  final LoginChallenge? challenge;
}

class LoginFlow extends Notifier<LoginFlowState?> {
  @override
  LoginFlowState? build() => null;

  void setPhone(String phone) => state = LoginFlowState(phone: phone);

  void start(String phone, LoginChallenge challenge) =>
      state = LoginFlowState(phone: phone, challenge: challenge);

  void updateChallenge(LoginChallenge challenge) {
    final current = state;
    if (current != null) {
      state = LoginFlowState(phone: current.phone, challenge: challenge);
    }
  }

  void clear() => state = null;
}

final loginFlowProvider =
    NotifierProvider<LoginFlow, LoginFlowState?>(LoginFlow.new);