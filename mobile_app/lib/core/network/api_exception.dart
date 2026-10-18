import 'package:dio/dio.dart';

class ApiException implements Exception {
  const ApiException(
    this.code,
    this.message, {
    this.statusCode,
    this.retryAfterSeconds,
  });

  final String code; // e.g. NUMBER_NOT_LINKED, OTP_INVALID, NETWORK
  final String message;
  final int? statusCode;
  final int? retryAfterSeconds;

  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['code'] is String) {
      return ApiException(
        data['code'] as String,
        (data['message'] as String?) ?? 'Request failed',
        statusCode: e.response?.statusCode,
        retryAfterSeconds: data['retryAfterSeconds'] as int?,
      );
    }
    const networkTypes = {
      DioExceptionType.connectionError,
      DioExceptionType.connectionTimeout,
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
    };
    if (networkTypes.contains(e.type)) {
      return const ApiException('NETWORK', 'No connection. Please try again.');
    }
    return ApiException(
      'UNKNOWN',
      'Something went wrong.',
      statusCode: e.response?.statusCode,
    );
  }

  @override
  String toString() => 'ApiException($code, $statusCode)';
}