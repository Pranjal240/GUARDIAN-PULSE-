import 'dart:async';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../core/constants.dart';

/// ══════════════════════════════════════════════════
/// Guardian Pulse — Alert Service (RTDB)
/// Listens for pending alerts and shows emergency dialog.
/// ══════════════════════════════════════════════════
class AlertService {
  AlertService._();
  static final AlertService instance = AlertService._();

  final _notifications = FlutterLocalNotificationsPlugin();
  StreamSubscription? _subscription;
  bool _isShowingDialog = false;

  Future<void> init() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    await _notifications.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );
  }

  void startListening(String userId, BuildContext context) {
    _subscription?.cancel();

    // Listen to RTDB alerts for this user
    _subscription = FirebaseDatabase.instance
        .ref(kDbAlerts)
        .orderByChild('userId')
        .equalTo(userId)
        .onChildAdded
        .listen((event) async {
      final data = Map<String, dynamic>.from(event.snapshot.value as Map);
      if (data['status'] == 'pending') {
        await _showNotification(data);
        if (context.mounted && !_isShowingDialog) {
          _showEmergencyDialog(context, data, event.snapshot.key ?? '');
        }
      }
    });
  }

  void stopListening() {
    _subscription?.cancel();
    _subscription = null;
  }

  Future<void> _showNotification(Map<String, dynamic> alertData) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'guardian_pulse_alerts',
        'Guardian Pulse Alerts',
        channelDescription: 'Emergency medical alerts',
        importance: Importance.max,
        priority: Priority.high,
        color: Color(0xFFE05252),
      ),
      iOS: DarwinNotificationDetails(sound: 'default'),
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      '🚨 ${alertData['alertType'] ?? 'Medical Alert'}',
      'Guardian Pulse detected an emergency condition.',
      details,
    );
  }

  void _showEmergencyDialog(
    BuildContext context,
    Map<String, dynamic> alertData,
    String alertId,
  ) {
    _isShowingDialog = true;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF2A1A1A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          '🚨 Medical Emergency',
          style: TextStyle(color: Color(0xFFE05252), fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              alertData['alertType'] as String? ?? 'Critical alert detected.',
              style: const TextStyle(color: Color(0xFFF2E8D9)),
            ),
            const SizedBox(height: 8),
            const Text(
              'Emergency contacts have been notified.',
              style: TextStyle(color: Color(0xFFA8B5A2), fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              _isShowingDialog = false;
              if (alertId.isNotEmpty) {
                await FirebaseDatabase.instance
                    .ref('$kDbAlerts/$alertId')
                    .update({'status': 'acknowledged'});
              }
            },
            child: const Text('I\'m Safe', style: TextStyle(color: Color(0xFFD4B896))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE05252)),
            child: const Text('Call 112'),
          ),
        ],
      ),
    ).then((_) => _isShowingDialog = false);
  }
}
