import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/network/api_exception.dart';
import '../domain/sos_category.dart';
import '../domain/sos_report.dart';

class SosRepository {
  SosRepository(this._dio);

  final Dio _dio;

  /// ASSUMPTION: the upload endpoint and its response are invented. The API
  /// document only shows the finished `media_attachment_url`.
  Future<String> uploadMedia({
    required String path,
    required String filename,
  }) async {
    try {
      final res = await _dio.post('/sos/media',
          data: FormData.fromMap({
            'file': await MultipartFile.fromFile(path, filename: filename),
          }));
      return (res.data as Map<String, dynamic>)['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Request body from the API document (section 4.2). The citizen id comes
  /// from the login token on the server, so the app does not send it.
  Future<SosReport> submit({
    required SosCategory category,
    required String description,
    required LatLng location,
    String? mediaUrl,
  }) async {
    try {
      final res = await _dio.post('/sos/submit', data: {
        'incident_type': category.apiValue,
        'location': {'lat': location.latitude, 'lng': location.longitude},
        'description': description,
        'media_attachment_url': ?mediaUrl,
      });
      return SosReport.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// ASSUMPTION: this endpoint is not in the documents yet.
  Future<List<SosReport>> mine() async {
    try {
      final res = await _dio.get('/sos/mine');
      final data = res.data;
      final list = (data is Map ? data['reports'] : data) as List? ?? const [];
      return [
        for (final r in list) SosReport.fromJson(r as Map<String, dynamic>),
      ]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}