import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nea_citizen/core/network/api_exception.dart';
import 'package:nea_citizen/core/network/mock_api_interceptor.dart';

Dio _mockDio() => Dio(BaseOptions(baseUrl: 'http://mock'))
  ..interceptors.add(MockApiInterceptor(delay: Duration.zero));

Future<ApiException> _verifyError(String phone) async {
  try {
    await _mockDio().post('/auth/phone/verify', data: {'phone': phone});
  } on DioException catch (e) {
    return ApiException.fromDio(e);
  }
  throw StateError('Expected the request to fail');
}

void main() {
  test('linked number gets a challenge', () async {
    final res = await _mockDio()
        .post('/auth/phone/verify', data: {'phone': '+251911000201'});
    expect(res.data['challengeId'], isNotEmpty);
  });

  test('not-linked number is rejected', () async {
    final err = await _verifyError('+251911000202');
    expect(err.code, 'NUMBER_NOT_LINKED');
  });

  test('rate-limited number returns retry time', () async {
    final err = await _verifyError('+251911000203');
    expect(err.code, 'RATE_LIMITED');
    expect(err.retryAfterSeconds, 60);
  });

  test('correct OTP returns tokens', () async {
    final res = await _mockDio().post('/auth/phone/confirm',
        data: {'challengeId': 'mock-challenge-1', 'code': '123456'});
    expect(res.data['accessToken'], isNotEmpty);
    expect(res.data['citizen']['registeredRegion'], 'bole');
  });

  test('wrong OTP is rejected', () async {
    try {
      await _mockDio().post('/auth/phone/confirm',
          data: {'challengeId': 'mock-challenge-1', 'code': '000000'});
      fail('should have thrown');
    } on DioException catch (e) {
      expect(ApiException.fromDio(e).code, 'OTP_INVALID');
    }
  });
}