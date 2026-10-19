import 'package:dio/dio.dart';

/// Fake backend for development. Every shape here is an ASSUMPTION
/// until the backend team confirms the real contract.
class MockApiInterceptor extends Interceptor {
  MockApiInterceptor({this.delay = const Duration(milliseconds: 400)});

  final Duration delay;

  static const linkedPhone = '+251911000201';
  static const notLinkedPhone = '+251911000202';
  static const rateLimitedPhone = '+251911000203';
  static const validOtp = '123456';

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    final body = options.data is Map ? options.data as Map : const {};

    switch (options.path) {
      case '/auth/phone/verify':
        return _verify(options, handler, body);
      case '/auth/phone/confirm':
        return _confirm(options, handler, body);
      case '/auth/refresh':
        return _ok(options, handler, _tokens());
            case '/devices':
        return _ok(options, handler, {'registered': true});
      default:
        return _fail(options, handler, 404, 'NOT_FOUND', 'Mock: no such endpoint');
    }
  }

  void _verify(RequestOptions o, RequestInterceptorHandler h, Map body) {
    final phone = (body['phone'] as String? ?? '').replaceAll(' ', '');
    switch (phone) {
      case linkedPhone:
        _ok(o, h, {
          'challengeId': 'mock-challenge-1',
          'expiresInSeconds': 300,
          'resendAfterSeconds': 30,
        });
      case rateLimitedPhone:
        _fail(o, h, 429, 'RATE_LIMITED', 'Too many tries. Try again later.',
            retryAfter: 60);
      default: // includes notLinkedPhone and any unknown number
        _fail(o, h, 404, 'NUMBER_NOT_LINKED',
            'This number is not linked to a Fayda ID.');
    }
  }

  void _confirm(RequestOptions o, RequestInterceptorHandler h, Map body) {
    if (body['code'] != validOtp) {
      _fail(o, h, 401, 'OTP_INVALID', 'The code is wrong.');
      return;
    }
    _ok(o, h, {
      ..._tokens(),
      'citizen': {
        'id': 'cit_mock_001',
        'phone': linkedPhone,
        'registeredRegion': 'bole',
      },
    });
  }

  Map<String, dynamic> _tokens() {
    final stamp = DateTime.now().millisecondsSinceEpoch;
    return {
      'accessToken': 'mock-access-$stamp',
      'refreshToken': 'mock-refresh-$stamp',
      'expiresInSeconds': 900,
    };
  }

  void _ok(RequestOptions o, RequestInterceptorHandler h, Object data) {
    h.resolve(Response(requestOptions: o, statusCode: 200, data: data));
  }

  void _fail(
    RequestOptions o,
    RequestInterceptorHandler h,
    int status,
    String code,
    String message, {
    int? retryAfter,
  }) {
    final response = Response(
      requestOptions: o,
      statusCode: status,
      data: {
        'code': code,
        'message': message,
        'retryAfterSeconds': ?retryAfter,
      },
    );
    h.reject(
      DioException.badResponse(
        statusCode: status,
        requestOptions: o,
        response: response,
      ),
      true,
    );
  }
}