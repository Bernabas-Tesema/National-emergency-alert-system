import 'dart:convert';

import 'package:dio/dio.dart';

import '../../../core/device/device_binding.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/token_storage.dart';
import '../domain/citizen.dart';

class LoginChallenge {
  const LoginChallenge({
    required this.challengeId,
    required this.resendAfterSeconds,
    required this.expiresInSeconds,
  });

  final String challengeId;
  final int resendAfterSeconds;
  final int expiresInSeconds;

  factory LoginChallenge.fromJson(Map<String, dynamic> json) => LoginChallenge(
        challengeId: json['challengeId'] as String,
        resendAfterSeconds: (json['resendAfterSeconds'] as int?) ?? 30,
        expiresInSeconds: (json['expiresInSeconds'] as int?) ?? 300,
      );
}

class AuthRepository {
  AuthRepository(this._dio, this._storage, this._device);

  final Dio _dio;
  final TokenStorage _storage;
  final DeviceBinding _device;

  /// ASSUMPTION: request and response shapes are not confirmed by the backend.
  Future<LoginChallenge> requestOtp(String phone) async {
    try {
      final res = await _dio.post('/auth/phone/verify', data: {
        'phone': phone,
        'deviceId': await _device.deviceId(),
      });
      return LoginChallenge.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Citizen> confirmOtp({
    required String challengeId,
    required String code,
  }) async {
    try {
      final res = await _dio.post('/auth/phone/confirm', data: {
        'challengeId': challengeId,
        'code': code,
        'deviceId': await _device.deviceId(),
      });
      final data = res.data as Map<String, dynamic>;
      final citizen = Citizen.fromJson(data['citizen'] as Map<String, dynamic>);
      await _storage.save(TokenPair(
        data['accessToken'] as String,
        data['refreshToken'] as String,
      ));
      await _storage.saveProfile(jsonEncode(citizen.toJson()));
      return citizen;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Returns the saved citizen if tokens and profile are both stored.
  Future<Citizen?> restore() async {
    final tokens = await _storage.read();
    final profile = await _storage.readProfile();
    if (tokens == null || profile == null) return null;
    return Citizen.fromJson(jsonDecode(profile) as Map<String, dynamic>);
  }

  Future<void> signOut() => _storage.clear();
}