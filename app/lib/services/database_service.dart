import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_core/firebase_core.dart';
import '../core/constants.dart';

/// ══════════════════════════════════════════════════
/// Guardian Pulse — Database Service
/// Wraps Firebase Realtime Database reads and writes
/// ══════════════════════════════════════════════════
class DatabaseService {
  DatabaseService._();
  static final DatabaseService instance = DatabaseService._();

  late final FirebaseDatabase _db;

  void init() {
    _db = FirebaseDatabase.instanceFor(
      app: Firebase.app(),
      databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
    );
    _db.setPersistenceEnabled(true);
  }

  // ─── User Profile ─────────────────────────────────
  DatabaseReference userRef(String userId) =>
      _db.ref('$kDbUsers/$userId');

  Stream<Map<String, dynamic>?> watchProfile(String userId) {
    return userRef(userId).onValue.map((event) {
      final data = event.snapshot.value;
      if (data == null) return null;
      return Map<String, dynamic>.from(data as Map? ?? {});
    });
  }

  Future<Map<String, dynamic>?> getProfile(String userId) async {
    final snap = await userRef(userId).get();
    if (!snap.exists) return null;
    return Map<String, dynamic>.from(snap.value as Map? ?? {});
  }

  Future<void> writeProfile(String userId, Map<String, dynamic> data) async {
    await userRef(userId).set({...data, 'updatedAt': ServerValue.timestamp});
  }

  Future<void> updateProfile(String userId, Map<String, dynamic> data) async {
    await userRef(userId).update({...data, 'updatedAt': ServerValue.timestamp});
  }

  Future<void> setFcmToken(String userId, String token) async {
    await userRef(userId).update({'fcmToken': token});
  }

  Future<void> setRole(String userId, String role) async {
    await userRef(userId).update({'role': role});
  }

  Future<void> updateMode(String userId, String mode) async {
    await _db.ref('$kDbUsers/$userId/mode').set(mode);
  }

  // ─── ECG Readings ─────────────────────────────────
  Stream<List<Map<String, dynamic>>> watchEcgReadings(
    String userId, {
    int limit = 60,
  }) {
    return _db
        .ref(kDbEcgReadings)
        .orderByChild('userId')
        .equalTo(userId)
        .limitToLast(limit)
        .onValue
        .map((event) => _snapshotToList(event.snapshot));
  }

  Future<List<Map<String, dynamic>>> getEcgHistory(
    String userId, {
    int limit = 200,
  }) async {
    final snap = await _db
        .ref(kDbEcgReadings)
        .orderByChild('userId')
        .equalTo(userId)
        .limitToLast(limit)
        .get();
    return _snapshotToList(snap);
  }

  // ─── Motion Data ──────────────────────────────────
  Stream<List<Map<String, dynamic>>> watchMotionData(
    String userId, {
    int limit = 30,
  }) {
    return _db
        .ref(kDbMotionData)
        .orderByChild('userId')
        .equalTo(userId)
        .limitToLast(limit)
        .onValue
        .map((event) => _snapshotToList(event.snapshot));
  }

  // ─── Alerts ───────────────────────────────────────
  Stream<List<Map<String, dynamic>>> watchAlerts(String userId) {
    return _db
        .ref(kDbAlerts)
        .orderByChild('userId')
        .equalTo(userId)
        .onValue
        .map((event) {
      final all = _snapshotToList(event.snapshot);
      return all.where((a) => a['status'] != 'resolved').toList();
    });
  }

  Stream<List<Map<String, dynamic>>> watchAllAlerts() {
    return _db
        .ref(kDbAlerts)
        .orderByChild('createdAt')
        .limitToLast(50)
        .onValue
        .map((event) => _snapshotToList(event.snapshot));
  }

  Future<void> resolveAlert(String alertId) async {
    await _db.ref('$kDbAlerts/$alertId').update({
      'status': 'resolved',
      'resolvedAt': ServerValue.timestamp,
    });
  }

  // ─── Chat ─────────────────────────────────────────
  Stream<List<Map<String, dynamic>>> watchChatMessages(
    String userId, {
    int limit = 50,
  }) {
    return _db
        .ref(kDbChatMessages)
        .orderByChild('userId')
        .equalTo(userId)
        .limitToLast(limit)
        .onValue
        .map((event) => _snapshotToList(event.snapshot));
  }

  Future<void> sendChatMessage(Map<String, dynamic> message) async {
    await _db.ref(kDbChatMessages).push().set({
      ...message,
      'timestamp': ServerValue.timestamp,
    });
  }

  // ─── Admin ────────────────────────────────────────
  Stream<List<Map<String, dynamic>>> watchAllPatients() {
    return _db
        .ref(kDbUsers)
        .orderByChild('role')
        .equalTo(kRolePatient)
        .onValue
        .map((event) => _snapshotToList(event.snapshot));
  }

  Stream<List<Map<String, dynamic>>> watchLatestEcgAllPatients() {
    return _db
        .ref(kDbEcgReadings)
        .orderByChild('timestamp')
        .limitToLast(100)
        .onValue
        .map((event) => _snapshotToList(event.snapshot));
  }

  // ─── Helpers ──────────────────────────────────────
  List<Map<String, dynamic>> _snapshotToList(DataSnapshot snapshot) {
    if (!snapshot.exists || snapshot.value == null) return [];
    final raw = Map<String, dynamic>.from(snapshot.value as Map? ?? {});
    return raw.entries.map((e) {
      final map = Map<String, dynamic>.from(e.value as Map? ?? {});
      map['_id'] = e.key;
      return map;
    }).toList()
      ..sort((a, b) {
        final ta = (a['timestamp'] ?? 0) as int;
        final tb = (b['timestamp'] ?? 0) as int;
        return ta.compareTo(tb);
      });
  }
}
