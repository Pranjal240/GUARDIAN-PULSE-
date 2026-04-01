import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:guardian_pulse/mocks/clerk_auth.dart';
import 'package:image_picker/image_picker.dart';

/// Centralized API service for all Cloudflare Worker backend calls.
/// Base URL: https://api.guardianpulse.in
class ApiService {
  static const String _baseUrl = 'https://api.guardianpulse.in';

  /// Get Clerk session token for authenticated requests.
  static Future<String> _getToken() async {
    final token = await ClerkAuth.session?.getToken();
    if (token == null || token.isEmpty) {
      throw Exception('Not authenticated. Please sign in again.');
    }
    return token;
  }

  static Map<String, String> _authHeaders(String token) => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  };

  // ─── Chat ──────────────────────────────────────────────────────────────────

  /// Send a message to the AI chatbot.
  /// Returns { response: String, needsSupport: bool }
  static Future<Map<String, dynamic>> sendChatMessage(
    String userId,
    String message, {
    List<Map<String, dynamic>> history = const [],
    String? mediaUrl,
  }) async {
    final token = await _getToken();
    final res = await http.post(
      Uri.parse('$_baseUrl/chat'),
      headers: _authHeaders(token),
      body: jsonEncode({
        'userId': userId,
        'message': message,
        'history': history,
        if (mediaUrl != null) 'mediaUrl': mediaUrl,
      }),
    );
    if (res.statusCode != 200) throw Exception('Chat failed: ${res.body}');
    return jsonDecode(res.body);
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  /// Resolve an active alert (user tapped "I'M OKAY").
  static Future<void> resolveAlert(String alertId) async {
    final token = await _getToken();
    final res = await http.post(
      Uri.parse('$_baseUrl/resolve-alert'),
      headers: _authHeaders(token),
      body: jsonEncode({'alertId': alertId}),
    );
    if (res.statusCode != 200) throw Exception('Resolve failed: ${res.body}');
  }

  /// Update GPS location during an active alert.
  static Future<void> updateAlertLocation(String alertId, double lat, double lng) async {
    final token = await _getToken();
    await http.post(
      Uri.parse('$_baseUrl/update-alert-location'),
      headers: _authHeaders(token),
      body: jsonEncode({'alertId': alertId, 'lat': lat, 'lng': lng}),
    );
  }

  // ─── Support ───────────────────────────────────────────────────────────────

  /// Request live human support.
  static Future<void> requestSupport() async {
    final token = await _getToken();
    final res = await http.post(
      Uri.parse('$_baseUrl/support-request'),
      headers: _authHeaders(token),
    );
    if (res.statusCode != 200) throw Exception('Support request failed: ${res.body}');
  }

  // ─── Media Upload (R2) ─────────────────────────────────────────────────────

  /// Upload a file to Cloudflare R2 via the backend.
  /// Returns { publicUrl: String, fileName: String }
  static Future<Map<String, dynamic>> uploadMedia(XFile file, {String type = 'chat'}) async {
    final token = await _getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$_baseUrl/upload-media'));
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['type'] = type;
    request.files.add(await http.MultipartFile.fromPath('file', file.path));

    final streamedRes = await request.send();
    final res = await http.Response.fromStream(streamedRes);
    if (res.statusCode != 200) throw Exception('Upload failed: ${res.body}');
    return jsonDecode(res.body);
  }

  // ─── Patient Data ──────────────────────────────────────────────────────────

  /// Get patient sensor history (admin use).
  static Future<Map<String, dynamic>> getPatientData(
    String targetUserId, {
    String type = 'all',
    int limit = 50,
  }) async {
    final token = await _getToken();
    final uri = Uri.parse('$_baseUrl/patient-data')
        .replace(queryParameters: {'userId': targetUserId, 'type': type, 'limit': '$limit'});
    final res = await http.get(uri, headers: _authHeaders(token));
    if (res.statusCode != 200) throw Exception('Patient data failed: ${res.body}');
    return jsonDecode(res.body);
  }

  // ─── FCM Token ─────────────────────────────────────────────────────────────

  /// Save FCM token to backend after login.
  static Future<void> saveFcmToken(String fcmToken) async {
    final token = await _getToken();
    await http.post(
      Uri.parse('$_baseUrl/save-fcm-token'),
      headers: _authHeaders(token),
      body: jsonEncode({'fcmToken': fcmToken}),
    );
  }
}
