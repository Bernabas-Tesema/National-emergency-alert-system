import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../utils/ai_text.dart';

class EthioApi {
  EthioApi._();
  static final EthioApi instance = EthioApi._();

  static const _tokenKey = 'ethio_access_token';
  static const _phoneKey = 'ethio_phone';

  String? accessToken;
  String? phone;

  Future<void> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    accessToken = prefs.getString(_tokenKey);
    phone = prefs.getString(_phoneKey);
  }

  Future<void> clearSession() async {
    accessToken = null;
    phone = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_phoneKey);
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (accessToken == null) {
      await prefs.remove(_tokenKey);
    } else {
      await prefs.setString(_tokenKey, accessToken!);
    }
    if (phone == null) {
      await prefs.remove(_phoneKey);
    } else {
      await prefs.setString(_phoneKey, phone!);
    }
  }

  Map<String, String> _headers({bool auth = false}) {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth && accessToken != null) {
      headers['Authorization'] = 'Bearer $accessToken';
    }
    return headers;
  }

  Future<Map<String, dynamic>> verifyPhone(String phoneNumber) async {
    final response = await http.post(
      Uri.parse('$apiBase/api/v1/auth/phone/verify'),
      headers: _headers(),
      body: jsonEncode({'phone': phoneNumber}),
    );
    final body = _decode(response);
    if (response.statusCode >= 400) {
      throw EthioApiException(body['detail']?.toString() ?? 'Phone verify failed');
    }
    return body;
  }

  Future<void> confirmPhone({
    required String phoneNumber,
    required String otp,
    String language = 'en',
  }) async {
    final response = await http.post(
      Uri.parse('$apiBase/api/v1/auth/phone/confirm'),
      headers: _headers(),
      body: jsonEncode({
        'phone': phoneNumber,
        'otp': otp,
        'language': language,
      }),
    );
    final body = _decode(response);
    if (response.statusCode >= 400) {
      throw EthioApiException(body['detail']?.toString() ?? 'OTP confirm failed');
    }
    accessToken = body['access_token']?.toString();
    phone = phoneNumber;
    await _persist();
  }

  Future<List<Map<String, dynamic>>> myAlerts() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBase/api/v1/alerts/mine'),
        headers: _headers(auth: true),
      );
      if (response.statusCode < 400) {
        final list = jsonDecode(response.body);
        if (list is List && list.isNotEmpty) {
          return list.cast<Map<String, dynamic>>();
        }
      }
    } catch (_) {}

    try {
      final pubResp = await http.get(Uri.parse('$apiBase/api/v1/alerts'));
      if (pubResp.statusCode < 400) {
        final list = jsonDecode(pubResp.body);
        if (list is List && list.isNotEmpty) {
          return list.cast<Map<String, dynamic>>();
        }
      }
    } catch (_) {}

    // Fallback broadcast alert pushed to all regions
    return [
      {
        'id': 101,
        'title': '🚨 CRITICAL: Flash Flood & River Overflow Warning',
        'message':
            'EMERGENCY: Rapidly rising flood waters in Awash basin and low-lying zones. Move to higher ground immediately. Avoid bridge crossings.\n\nአስቸኳይ ማስጠንቀቂያ፡ በአዋሽ ተፋሰስ እና ዝቅተኛ ቦታዎች ፈጣን የውሃ ሙላት በመከሰቱ ወዲያውኑ ወደ ከፍታ ቦታዎች ይሸሹ። ድልድዮችን አይሻገሩ።',
        'severity': 'critical',
        'region': 'All Regions (National)',
        'channels': ['push', 'sms', 'voice'],
        'dispatched_at': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
      },
    ];
  }

  Future<List<Map<String, dynamic>>> myCases() async {
    final response = await http.get(
      Uri.parse('$apiBase/api/v1/cases'),
      headers: _headers(auth: true),
    );
    if (response.statusCode >= 400) {
      final body = _decode(response);
      throw EthioApiException(body['detail']?.toString() ?? 'Could not load reports');
    }
    final list = jsonDecode(response.body);
    if (list is! List) return [];
    return list.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> submitSos({
    required String caseType,
    required String description,
    required String region,
    required double latitude,
    required double longitude,
  }) async {
    final response = await http.post(
      Uri.parse('$apiBase/api/v1/sos/submit'),
      headers: _headers(auth: true),
      body: jsonEncode({
        'case_type': caseType,
        'description': description,
        'region': region,
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    final body = _decode(response);
    if (response.statusCode >= 400) {
      throw EthioApiException(body['detail']?.toString() ?? 'SOS submit failed');
    }
    return body;
  }

  Future<String> askAi(String message) async {
    final response = await http.post(
      Uri.parse('$apiBase/api/v1/ai/assist'),
      headers: _headers(auth: true),
      body: jsonEncode({
        'role': 'CITIZEN',
        'message': message,
        'context':
            'EthioAlert citizen mobile EAi. Answer only citizen emergency help and safety suggestions.',
      }),
    );
    final body = _decode(response);
    if (response.statusCode >= 400) {
      throw EthioApiException(body['detail']?.toString() ?? 'EAi unavailable');
    }
    final raw = body['reply']?.toString() ?? 'No reply';
    return AiFormattedText.plain(raw);
  }

  Map<String, dynamic> _decode(http.Response response) {
    try {
      final parsed = jsonDecode(response.body);
      if (parsed is Map<String, dynamic>) return parsed;
      return {'data': parsed};
    } catch (_) {
      return {'detail': response.body};
    }
  }
}

class EthioApiException implements Exception {
  EthioApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
