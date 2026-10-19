import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/auth_repository.dart';
import '../domain/citizen.dart';

enum AuthStatus { unknown, signedOut, signedIn }

class AuthState {
  const AuthState(this.status, [this.citizen]);
  final AuthStatus status;
  final Citizen? citizen;
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(dioProvider),
    ref.watch(tokenStorageProvider),
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
    final citizen = await ref.read(authRepositoryProvider).restore();
    await Future<void>.delayed(const Duration(milliseconds: 900)); // splash
    state = citizen == null
        ? const AuthState(AuthStatus.signedOut)
        : AuthState(AuthStatus.signedIn, citizen);
  }

  void markSignedIn(Citizen citizen) =>
      state = AuthState(AuthStatus.signedIn, citizen);

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    state = const AuthState(AuthStatus.signedOut);
  }

  void _onExpired() {
    if (state.status == AuthStatus.signedIn) signOut();
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