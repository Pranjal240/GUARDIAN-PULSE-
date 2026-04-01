import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_database/firebase_database.dart';
import '../services/database_service.dart';

/// ══════════════════════════════════════════════════
/// Guardian Pulse — Sensor / Data Providers (RTDB)
/// All data comes from Firebase Realtime Database
/// ══════════════════════════════════════════════════

// ─── Current User ID ──────────────────────────────
final currentUserIdProvider = StateProvider<String?>((ref) => 'pranjal_001');

// ─── User Profile ─────────────────────────────────
final userProfileProvider = StreamProvider.family<Map<String, dynamic>?, String>(
  (ref, userId) => DatabaseService.instance.watchProfile(userId),
);

// ─── Live ECG (last 60 readings) ──────────────────
final ecgReadingsProvider = StreamProvider.family<List<Map<String, dynamic>>, String>(
  (ref, userId) => DatabaseService.instance.watchEcgReadings(userId, limit: 60),
);

// ─── Latest Single ECG Reading ────────────────────
final latestEcgProvider = Provider.family<Map<String, dynamic>?, String>((ref, userId) {
  final readings = ref.watch(ecgReadingsProvider(userId));
  return readings.when(
    data: (list) => list.isNotEmpty ? list.last : null,
    loading: () => null,
    error: (_, __) => null,
  );
});

// ─── Latest BPM value ─────────────────────────────
final latestBpmProvider = Provider.family<int, String>((ref, userId) {
  final ecg = ref.watch(latestEcgProvider(userId));
  if (ecg == null) return 0;
  return (ecg['bpm'] as num?)?.toInt() ?? 0;
});

// ─── Motion Data ──────────────────────────────────
final motionDataProvider = StreamProvider.family<List<Map<String, dynamic>>, String>(
  (ref, userId) => DatabaseService.instance.watchMotionData(userId),
);

final latestMotionProvider = Provider.family<Map<String, dynamic>?, String>((ref, userId) {
  final data = ref.watch(motionDataProvider(userId));
  return data.when(
    data: (list) => list.isNotEmpty ? list.last : null,
    loading: () => null,
    error: (_, __) => null,
  );
});

// ─── Tremor detected ──────────────────────────────
final tremorDetectedProvider = Provider.family<bool, String>((ref, userId) {
  final motion = ref.watch(latestMotionProvider(userId));
  return motion?['tremorDetected'] == true;
});

// ─── Stress Level (0–100) ─────────────────────────
final stressLevelProvider = Provider.family<double, String>((ref, userId) {
  final ecg = ref.watch(latestEcgProvider(userId));
  return ((ecg?['stressLevel'] as num?) ?? 0).toDouble();
});

// ─── Active Alerts ────────────────────────────────
final activeAlertsProvider = StreamProvider.family<List<Map<String, dynamic>>, String>(
  (ref, userId) => DatabaseService.instance.watchAlerts(userId),
);

// ─── Chat Messages ────────────────────────────────
final chatMessagesProvider = StreamProvider.family<List<Map<String, dynamic>>, String>(
  (ref, userId) => DatabaseService.instance.watchChatMessages(userId),
);

// ─── Pi Connection Status ─────────────────────────
/// Pi is considered online if last ECG reading < 15 seconds ago
final isPiConnectedProvider = Provider.family<bool, String>((ref, userId) {
  final ecg = ref.watch(latestEcgProvider(userId));
  if (ecg == null) return false;
  final ts = (ecg['timestamp'] as int?) ?? 0;
  final diff = DateTime.now().millisecondsSinceEpoch - ts;
  return diff < 15000; // 15s threshold
});

// ─── Admin: All Patients ──────────────────────────
final allPatientsProvider = StreamProvider<List<Map<String, dynamic>>>(
  (ref) => DatabaseService.instance.watchAllPatients(),
);

// ─── Admin: All Alerts ────────────────────────────
final allAlertsProvider = StreamProvider<List<Map<String, dynamic>>>(
  (ref) => DatabaseService.instance.watchAllAlerts(),
);

// ─── Admin: Pending Alerts Count ─────────────────
final pendingAlertsCountProvider = Provider<int>((ref) {
  final alerts = ref.watch(allAlertsProvider);
  return alerts.when(
    data: (list) => list.where((a) => a['status'] == 'pending').length,
    loading: () => 0,
    error: (_, __) => 0,
  );
});
