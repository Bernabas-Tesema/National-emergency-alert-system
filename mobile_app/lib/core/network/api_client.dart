import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'auth_interceptor.dart';
import 'mock_api_interceptor.dart';

/// Tells the rest of the app that the login is no longer valid.
/// The router will listen to this in the login step.
class SessionEvents {
  final ValueNotifier<int> expired = ValueNotifier(0);
  void notifyExpired() => expired.value++;
}

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());
final sessionEventsProvider = Provider<SessionEvents>((ref) => SessionEvents());

Dio _buildDio() => Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Accept': 'application/json'},
    ));

final dioProvider = Provider<Dio>((ref) {
  final dio = _buildDio();
  final refreshDio = _buildDio();

  dio.interceptors.add(AuthInterceptor(
    storage: ref.watch(tokenStorageProvider),
    dio: dio,
    refreshDio: refreshDio,
    onSessionExpired: ref.watch(sessionEventsProvider).notifyExpired,
  ));

  // The mock goes last so the auth header is attached first.
  if (AppConfig.useMock) {
    dio.interceptors.add(MockApiInterceptor());
    refreshDio.interceptors.add(MockApiInterceptor());
  }
  return dio;
});