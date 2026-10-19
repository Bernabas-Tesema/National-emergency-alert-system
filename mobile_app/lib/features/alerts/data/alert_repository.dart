import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';
import '../domain/alert.dart';

class AlertRepository {
  AlertRepository(this._dio);

  final Dio _dio;

  /// ASSUMPTION: paging, which alerts are returned and the sort order are
  /// still open questions for the backend. We sort newest first ourselves.
  Future<List<Alert>> mine() async {
    try {
      final res = await _dio.get('/alerts/mine');
      final data = res.data;
      final list = (data is Map ? data['alerts'] : data) as List? ?? const [];
      final alerts = [
        for (final a in list) Alert.fromJson(a as Map<String, dynamic>),
      ]..sort((a, b) => b.issuedAt.compareTo(a.issuedAt));
      return alerts;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Alert> byId(String id) async {
    try {
      final res = await _dio.get('/alerts/$id');
      return Alert.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}