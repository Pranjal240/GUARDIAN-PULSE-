import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:guardian_pulse/mocks/clerk_auth.dart';

import 'core/constants.dart';
import 'core/theme.dart';
import 'services/database_service.dart';
import 'screens/splash_screen.dart';

/// Background FCM message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase is already initialized at this point
  print('[FCM Background] Alert received: ${message.notification?.title}');
  // Alert display is handled by the system notification + AlertService when app opens
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase with Guardian Pulse config
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc',
      authDomain: 'guardian-pulse-1360c.firebaseapp.com',
      databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
      projectId: 'guardian-pulse-1360c',
      storageBucket: 'guardian-pulse-1360c.firebasestorage.app',
      messagingSenderId: '1058794098347',
      appId: '1:1058794098347:web:e358b1e45760d97127b1ee',
      measurementId: 'G-6FHJC9ZZ2C',
    ),
  );

  // Register background FCM handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Initialize Hive (local 30-day ECG cache)
  await Hive.initFlutter();
  await Hive.openBox('ecg_cache');
  await Hive.openBox('settings');

  // Initialize Firebase Realtime Database service
  DatabaseService.instance.init();

  runApp(
    const ProviderScope(
      child: GuardianPulseApp(),
    ),
  );
}

class GuardianPulseApp extends StatelessWidget {
  const GuardianPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ClerkAuth(
      publishableKey: kClerkPublishableKey,
      child: MaterialApp(
        title: 'Guardian Pulse',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        home: const SplashScreen(),
      ),
    );
  }

}

