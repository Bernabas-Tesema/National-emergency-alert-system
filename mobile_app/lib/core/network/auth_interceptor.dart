import 'package:dio/dio.dart';
import '../storage/token_storage.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.storage,
    required this.dio,
    required this.refreshDio,
    required this.onSessionExpired,
  });

  final TokenStorage storage;
  final Dio dio; // main client, used to retry the failed request
  final Dio refreshDio; // separate client with no auth interceptor
  final void Function() onSessionExpired;

  Future<TokenPair?>? _refreshing; // one refresh at a time

  bool _isAuthPath(RequestOptions o) => o.path.startsWith('/auth/');

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    if (!_isAuthPath(options)) {
      final tokens = await storage.read();
      if (tokens != null) {
        options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
      }
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final req = err.requestOptions;
    final shouldRefresh = err.response?.statusCode == 401 &&
        !_isAuthPath(req) &&
        req.extra['retried'] != true;
    if (!shouldRefresh) return handler.next(err);

    final fresh =
        await (_refreshing ??= _refresh().whenComplete(() => _refreshing = null));
    if (fresh == null) {
      onSessionExpired();
      return handler.next(err);
    }

    req.extra['retried'] = true;
    try {
      handler.resolve(await dio.fetch(req));
    } on DioException catch (e) {
      handler.next(e);
    }
  }

  Future<TokenPair?> _refresh() async {
    final old = await storage.read();
    if (old == null) return null;
    try {
      // ASSUMPTION: refresh endpoint shape is not defined yet.
      final res = await refreshDio
          .post('/auth/refresh', data: {'refreshToken': old.refreshToken});
      final data = res.data as Map<String, dynamic>;
      final pair = TokenPair(
        data['accessToken'] as String,
        data['refreshToken'] as String,
      );
      await storage.save(pair);
      return pair;
    } on DioException {
      await storage.clear();
      return null;
    }
  }
}