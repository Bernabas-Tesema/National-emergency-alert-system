import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenPair {
  const TokenPair(this.accessToken, this.refreshToken);

  final String accessToken;
  final String refreshToken;
}

class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _profileKey = 'citizen_profile';

  static const _biometricKey = 'biometric_enabled';
  static const _offeredKey = 'biometric_offered';
  static const _deviceIdKey = 'device_id';
  static const _fingerprintKey = 'device_fingerprint';

  Future<TokenPair?> read() async {
    final access = await _storage.read(key: _accessKey);
    final refresh = await _storage.read(key: _refreshKey);

    if (access == null || refresh == null) return null;

    return TokenPair(access, refresh);
  }

  Future<void> save(TokenPair pair) async {
    await _storage.write(key: _accessKey, value: pair.accessToken);
    await _storage.write(key: _refreshKey, value: pair.refreshToken);
  }

  Future<String?> readProfile() => _storage.read(key: _profileKey);

  Future<void> saveProfile(String json) =>
      _storage.write(key: _profileKey, value: json);

  // Biometric settings.
  Future<bool> readBiometricEnabled() async =>
      (await _storage.read(key: _biometricKey)) == 'true';

  Future<void> saveBiometricEnabled(bool value) =>
      _storage.write(key: _biometricKey, value: value.toString());

  Future<bool> readBiometricOffered() async =>
      (await _storage.read(key: _offeredKey)) == 'true';

  Future<void> saveBiometricOffered(bool value) =>
      _storage.write(key: _offeredKey, value: value.toString());

  // Device identity survives sign-out.
  Future<String?> readDeviceId() => _storage.read(key: _deviceIdKey);

  Future<void> saveDeviceId(String id) =>
      _storage.write(key: _deviceIdKey, value: id);

  Future<String?> readFingerprint() =>
      _storage.read(key: _fingerprintKey);

  Future<void> saveFingerprint(String value) =>
      _storage.write(key: _fingerprintKey, value: value);

  // Sign-out clears session and biometric settings but preserves device identity.
  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _profileKey);
    await _storage.delete(key: _biometricKey);
    await _storage.delete(key: _offeredKey);
  }
}