import 'package:nea_citizen/core/storage/token_storage.dart';
import 'dart:convert';
/// Keeps everything in memory, so widget tests need no phone.
class MemoryTokenStorage extends TokenStorage {
  TokenPair? _tokens;
  String? _profile;
  bool _biometric = false;
  bool _offered = false;
  String? _deviceId;
  String? _fingerprint;

  @override
  Future<TokenPair?> read() async => _tokens;
  @override
  Future<void> save(TokenPair pair) async => _tokens = pair;
  @override
  Future<String?> readProfile() async => _profile;
  @override
  Future<void> saveProfile(String json) async => _profile = json;
  @override
  Future<bool> readBiometricEnabled() async => _biometric;
  @override
  Future<void> saveBiometricEnabled(bool value) async => _biometric = value;
  @override
  Future<bool> readBiometricOffered() async => _offered;
  @override
  Future<void> saveBiometricOffered(bool value) async => _offered = value;
  @override
  Future<String?> readDeviceId() async => _deviceId;
  @override
  Future<void> saveDeviceId(String id) async => _deviceId = id;
  @override
  Future<String?> readFingerprint() async => _fingerprint;
  @override
  Future<void> saveFingerprint(String value) async => _fingerprint = value;
  @override
  Future<void> clear() async {
    _tokens = null;
    _profile = null;
    _biometric = false;
    _offered = false;
  }
}
/// A citizen who is already signed in.
Future<MemoryTokenStorage> signedInStorage() async {
  final storage = MemoryTokenStorage();
  await storage.save(const TokenPair('access', 'refresh'));
  await storage.saveProfile(jsonEncode({
    'id': 'cit_mock_001',
    'phone': '+251911000201',
    'registeredRegion': 'bole',
  }));
  return storage;
}