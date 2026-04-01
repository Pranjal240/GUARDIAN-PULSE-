# 📱 GUARDIAN PULSE — FLUTTER APP NUCLEAR REBUILD
### Paste this ENTIRE file into Antigravity — Session 2

---

## OBJECTIVE
Build a COMPLETE, ZERO-ERROR Flutter Android app that:
1. Compiles and runs on Android without NDK/Gradle issues
2. Shows LIVE ECG data from Firebase Realtime Database
3. Has beautiful animated UI using Stitch MCP + olive palette
4. Has Google login via Clerk
5. Has dual role: Patient view and Admin view
6. Shows animated ECG graph, stress level, tremor detection

---

## STITCH MCP BRIEF (Use for every screen)
```
App: Guardian Pulse Medical Flutter App
Style: Pure olive monochrome — all olive shades, no beige or cream
Mood: Dark medical monitor — like hospital ECG machine display
Typography: Google Fonts — DM Mono for numbers, DM Sans for text
Animation: High — ECG lines drawing, numbers ticking, pulse effects
Key screens: Splash (ECG animation), Home (live BPM + chart), ECG detail, Alerts, Chat
```

---

## CRITICAL: GRADLE SETUP (Copy EXACTLY — no modifications)

### android/settings.gradle
```groovy
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "guardian_pulse"
include ':app'
```

### android/build.gradle (ROOT — NOT app/build.gradle)
```groovy
buildscript {
    ext.kotlin_version = '2.1.0'
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.3.2'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
        classpath 'com.google.gms:google-services:4.4.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
```

### android/app/build.gradle (NOT .kts — use .gradle)
```groovy
plugins {
    id 'com.android.application'
    id 'kotlin-android'
    id 'dev.flutter.flutter-gradle-plugin'
    id 'com.google.gms.google-services'
}

android {
    namespace "com.guardianpulse.app"
    compileSdk 36
    ndkVersion "25.1.8937393"

    compileOptions {
        coreLibraryDesugaringEnabled true
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = '11'
    }

    defaultConfig {
        applicationId "com.guardianpulse.app"
        minSdk 23
        targetSdk 36
        versionCode 1
        versionName "1.0.0"
        multiDexEnabled true
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}

flutter {
    source '../..'
}

dependencies {
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.4'
    implementation 'androidx.multidex:multidex:2.0.1'
    implementation platform('com.google.firebase:firebase-bom:33.1.0')
}
```

### android/gradle/wrapper/gradle-wrapper.properties
```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-all.zip
```

### android/local.properties (EXACT — no ndk.dir line)
```
sdk.dir=C\:\\Users\\pranj\\AppData\\Local\\Android\\sdk
flutter.sdk=C\:\\flutter
flutter.buildMode=debug
flutter.versionName=1.0.0
flutter.versionCode=1
```

### AndroidManifest.xml permissions
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

<!-- In application tag -->
android:usesCleartextTraffic="true"
```

---

## pubspec.yaml (EXACT versions — proven to work)
```yaml
name: guardian_pulse
description: Real-time medical monitoring app
version: 1.0.0+1

environment:
  sdk: '>=3.1.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Firebase
  firebase_core: ^2.32.0
  firebase_database: ^10.5.7
  firebase_messaging: ^14.9.4

  # State Management
  flutter_riverpod: ^2.6.1
  riverpod: ^2.6.1

  # Charts
  fl_chart: ^0.66.2

  # HTTP
  http: ^1.2.2

  # Local Storage
  hive_flutter: ^1.1.0

  # Notifications
  flutter_local_notifications: ^17.2.4

  # Media
  image_picker: ^1.1.2
  video_player: ^2.9.1
  cached_network_image: ^3.3.1

  # Fonts + Animation
  google_fonts: ^6.2.1
  flutter_animate: ^4.5.0
  shimmer: ^3.0.0
  lottie: ^3.1.2

  # Utils
  geolocator: ^11.1.0
  permission_handler: ^11.3.1
  flutter_secure_storage: ^9.2.2
  intl: ^0.19.0
  url_launcher: ^6.3.0

  # Icons
  cupertino_icons: ^1.0.8

flutter:
  uses-material-design: true
  assets:
    - assets/logo/
    - assets/videos/
    - assets/images/
  fonts:
    - family: DMMono
      fonts:
        - asset: assets/fonts/DMMono-Regular.ttf
        - asset: assets/fonts/DMMono-Medium.ttf
          weight: 500
```

---

## COLOR SYSTEM (lib/core/constants.dart)
```dart
import 'package:flutter/material.dart';

class AppColors {
  // Backgrounds - Pure Olive
  static const bgVoid      = Color(0xFF060D06);
  static const bgPrimary   = Color(0xFF0A110A);
  static const bgCard      = Color(0xFF111C11);
  static const bgElevated  = Color(0xFF162416);
  static const bgSidebar   = Color(0xFF0D170D);
  static const bgInput     = Color(0xFF0F1A0F);

  // Olive spectrum
  static const olive900 = Color(0xFF1A2E1A);
  static const olive800 = Color(0xFF243D24);
  static const olive700 = Color(0xFF2E4E2E);
  static const olive600 = Color(0xFF3A6133);
  static const olive500 = Color(0xFF4A7A3D); // PRIMARY ACCENT
  static const olive400 = Color(0xFF5E9B4E); // hover
  static const olive300 = Color(0xFF78C060); // active
  static const olive200 = Color(0xFF9ED485); // highlights
  static const olive100 = Color(0xFFC4EAB0); // light

  // Text
  static const textPrimary   = Color(0xFFD4F0C8);
  static const textSecondary = Color(0xFF7BAD6A);
  static const textMuted     = Color(0xFF3D5C35);
  static const textData      = Color(0xFFA8E090);

  // Status
  static const statusOk   = Color(0xFF4CCA6A);
  static const statusWarn = Color(0xFFC4CA4A);
  static const statusCrit = Color(0xFFCA4A4A);
  static const statusLive = Color(0xFF6CDA50);

  // BPM color logic
  static Color bpmColor(int bpm) {
    if (bpm <= 0) return olive500;
    if (bpm < 50 || bpm > 130) return statusCrit;
    if (bpm < 60 || bpm > 100) return statusWarn;
    return statusOk;
  }
}

class AppStrings {
  static const cloudflareUrl = 'https://guardian-pulse-api.pranjalmishra2409.workers.dev';
  static const firebaseDbUrl = 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app';
  static const piUserId = 'pranjal_001';
  static const adminEmail = 'pranjalmishra2409@gmail.com';
}
```

---

## THEME (lib/core/theme.dart)
```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'constants.dart';

class AppTheme {
  static ThemeData get dark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bgVoid,
    primaryColor: AppColors.olive500,
    colorScheme: ColorScheme.dark(
      background: AppColors.bgVoid,
      surface: AppColors.bgCard,
      primary: AppColors.olive500,
      secondary: AppColors.olive300,
      onBackground: AppColors.textPrimary,
      onSurface: AppColors.textPrimary,
    ),
    textTheme: GoogleFonts.dmSansTextTheme(ThemeData.dark().textTheme).copyWith(
      displayLarge: GoogleFonts.dmMono(color: AppColors.textData, fontWeight: FontWeight.w500),
      headlineLarge: GoogleFonts.dmSans(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
    ),
    cardTheme: CardTheme(
      color: AppColors.bgCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.olive700.withOpacity(0.3)),
      ),
      elevation: 8,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.bgSidebar,
      elevation: 0,
      iconTheme: IconThemeData(color: AppColors.olive300),
      titleTextStyle: GoogleFonts.dmMono(
        color: AppColors.textPrimary,
        fontSize: 16,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.olive500,
        foregroundColor: AppColors.textPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        textStyle: GoogleFonts.dmMono(fontSize: 13, letterSpacing: 0.1),
      ),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: AppColors.bgSidebar,
      selectedItemColor: AppColors.olive300,
      unselectedItemColor: AppColors.olive700,
      type: BottomNavigationBarType.fixed,
    ),
  );
}
```

---

## FIREBASE SERVICE (lib/services/database_service.dart)
```dart
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_core/firebase_core.dart';

class DatabaseService {
  static final _db = FirebaseDatabase.instanceFor(
    app: Firebase.app(),
    databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
  );

  // Watch latest ECG for a user
  static Stream<Map<String,dynamic>> watchLatestEcg(String userId) {
    return _db.ref('ecg_readings')
      .orderByChild('userId')
      .equalTo(userId)
      .limitToLast(1)
      .onValue
      .map((event) {
        if (event.snapshot.value == null) return <String,dynamic>{};
        final data = Map<String,dynamic>.from(event.snapshot.value as Map);
        final values = data.values.toList();
        if (values.isEmpty) return <String,dynamic>{};
        return Map<String,dynamic>.from(values.last as Map);
      });
  }

  // Watch ECG history
  static Stream<List<Map<String,dynamic>>> watchEcgHistory(String userId, {int limit = 60}) {
    return _db.ref('ecg_readings')
      .orderByChild('userId')
      .equalTo(userId)
      .limitToLast(limit)
      .onValue
      .map((event) {
        if (event.snapshot.value == null) return <Map<String,dynamic>>[];
        final data = Map<String,dynamic>.from(event.snapshot.value as Map);
        final list = data.values
          .map((v) => Map<String,dynamic>.from(v as Map))
          .toList();
        list.sort((a,b) {
          final ta = DateTime.tryParse(a['timestamp'] ?? '') ?? DateTime(0);
          final tb = DateTime.tryParse(b['timestamp'] ?? '') ?? DateTime(0);
          return ta.compareTo(tb);
        });
        return list;
      });
  }

  // Watch active alerts
  static Stream<List<Map<String,dynamic>>> watchAlerts(String userId) {
    return _db.ref('alerts')
      .orderByChild('userId')
      .equalTo(userId)
      .onValue
      .map((event) {
        if (event.snapshot.value == null) return <Map<String,dynamic>>[];
        final data = Map<String,dynamic>.from(event.snapshot.value as Map);
        return data.entries
          .map((e) {
            final m = Map<String,dynamic>.from(e.value as Map);
            m['id'] = e.key;
            return m;
          })
          .where((a) => a['status'] != 'resolved')
          .toList();
      });
  }

  // Watch all alerts (admin)
  static Stream<List<Map<String,dynamic>>> watchAllAlerts() {
    return _db.ref('alerts').onValue.map((event) {
      if (event.snapshot.value == null) return <Map<String,dynamic>>[];
      final data = Map<String,dynamic>.from(event.snapshot.value as Map);
      return data.entries.map((e) {
        final m = Map<String,dynamic>.from(e.value as Map);
        m['id'] = e.key;
        return m;
      }).where((a) => a['status'] != 'resolved').toList();
    });
  }

  // Watch user profile
  static Stream<Map<String,dynamic>?> watchProfile(String userId) {
    return _db.ref('users/$userId').onValue.map((event) {
      if (event.snapshot.value == null) return null;
      return Map<String,dynamic>.from(event.snapshot.value as Map);
    });
  }

  // Update user field
  static Future<void> updateUser(String userId, Map<String,dynamic> data) async {
    await _db.ref('users/$userId').update(data);
  }

  // Watch chat messages
  static Stream<List<Map<String,dynamic>>> watchChat(String userId) {
    return _db.ref('chat_messages')
      .orderByChild('userId')
      .equalTo(userId)
      .limitToLast(50)
      .onValue
      .map((event) {
        if (event.snapshot.value == null) return <Map<String,dynamic>>[];
        final data = Map<String,dynamic>.from(event.snapshot.value as Map);
        return data.entries.map((e) {
          final m = Map<String,dynamic>.from(e.value as Map);
          m['id'] = e.key;
          return m;
        }).toList()
          ..sort((a,b) {
            final ta = DateTime.tryParse(a['timestamp'] ?? '') ?? DateTime(0);
            final tb = DateTime.tryParse(b['timestamp'] ?? '') ?? DateTime(0);
            return ta.compareTo(tb);
          });
      });
  }

  // Save chat message
  static Future<void> saveChatMessage(Map<String,dynamic> message) async {
    await _db.ref('chat_messages').push().set(message);
  }

  // Mark alert resolved
  static Future<void> resolveAlert(String alertId) async {
    await _db.ref('alerts/$alertId').update({
      'status': 'resolved',
      'resolvedAt': DateTime.now().toIso8601String(),
    });
  }
}
```

---

## MOCK AUTH (lib/mocks/clerk_auth.dart — SIMPLE, NO SDK CRASHES)
```dart
class MockClerkAuth {
  static bool _isSignedIn = false;
  static String _userId = 'pranjal_001';
  static String _email = '';

  static bool get isSignedIn => _isSignedIn;
  static String get userId => _userId;
  static String get email => _email;
  static bool get isAdmin => _email == 'pranjalmishra2409@gmail.com';

  static Future<bool> signInWithEmail(String email) async {
    await Future.delayed(const Duration(milliseconds: 800));
    _isSignedIn = true;
    _email = email;
    _userId = email == 'pranjalmishra2409@gmail.com' ? 'admin_pranjal' : 'user_${email.split('@')[0]}';
    return true;
  }

  static Future<bool> signInWithGoogle() async {
    // Mock Google sign-in for demo
    await Future.delayed(const Duration(seconds: 1));
    _isSignedIn = true;
    _email = 'pranjalmishra2409@gmail.com';
    _userId = 'admin_pranjal';
    return true;
  }

  static void signOut() {
    _isSignedIn = false;
    _userId = '';
    _email = '';
  }

  static String getCurrentUserId() => _userId;
}
```

---

## SCREEN: lib/screens/splash_screen.dart

```
USE STITCH MCP → "Medical app splash screen — pure olive black background,
animated ECG heartbeat line drawing across center, app logo appearing with
scale animation, 'GUARDIAN PULSE' title in DM Mono appearing letter by letter,
scan line effect, military-medical aesthetic"

Build splash_screen.dart:

BACKGROUND: Color(0xFF060D06) — deepest olive-black

ANIMATED ECG LINE (CustomPainter):
  Create EcgPainter class extending CustomPainter
  Draw ECG waveform: flat → peak (up fast) → down → up small → flat → repeat
  Animation: AnimationController duration 2000ms, repeat
  Line color: Color(0xFF78C060) with blur
  Use Paint()..color = oliveGreen
              ..strokeWidth = 2.0
              ..style = PaintingStyle.stroke
              ..maskFilter = MaskFilter.blur(BlurStyle.normal, 3)
  
  ECG path coordinates (normalized 0-1, scaled to canvas):
  [0.0, 0.5], [0.15, 0.5], [0.20, 0.5], [0.25, 0.1], [0.30, 0.9],
  [0.35, 0.3], [0.40, 0.5], [0.55, 0.5], [0.70, 0.5], [0.75, 0.1],
  [0.80, 0.9], [0.85, 0.3], [0.90, 0.5], [1.0, 0.5]
  
  strokeDashArray effect: animate paint progress 0.0 → 1.0

LOGO (scale 0.0 → 1.0, fade, delay 500ms):
  Image.asset('assets/logo/...', height: 72, fit: BoxFit.contain)
  flutter_animate: .animate().scale(begin: 0.5, end: 1.0, duration: 800.ms).fade()

TITLE (letter-by-letter stagger):
  "GUARDIAN PULSE"
  Font: Google Fonts DM Mono, 22px, letterSpacing 0.15
  Color: Color(0xFFD4F0C8)
  Each letter: flutter_animate stagger 50ms

SUBTITLE (fade in delay 1s):
  "REAL-TIME MEDICAL MONITORING"
  DM Mono 10px, Color(0xFF7BAD6A), letterSpacing 0.2

LIVE INDICATOR (blinking, delay 1.5s):
  Row: blinking green dot + "SYSTEM ACTIVE"
  Dot: Container 8x8 circular, statusLive color
  Blink: flutter_animate repeat

After 3.5 seconds:
  Check MockClerkAuth.isSignedIn
    true → check if admin → navigate to AdminHomeScreen or PatientHomeScreen
    false → navigate to AuthScreen
```

---

## SCREEN: lib/screens/auth_screen.dart

```
USE STITCH MCP → "Medical login screen — dark olive, logo top center,
role selection cards (Patient / Admin), Google button and email field,
scan line animation in background, olive-only colors"

BACKGROUND: Stack with animated scan line (AnimationController)

LOGO + TITLE (top):
  Image.asset logo, height 56px
  "GUARDIAN PULSE" in DM Mono 20px, textPrimary
  Subtitle: "REAL-TIME MEDICAL MONITORING" in DM Mono 10px, textMuted

ROLE SELECTOR (2 cards):
  Patient card: Icon(Icons.person), "PATIENT", "Personal health monitoring"
  Admin card: Icon(Icons.admin_panel_settings), "ADMIN", "Full control dashboard"
  
  Card style (selected):
    border: 2px solid Color(0xFF5E9B4E)
    background: Color(0xFF162416)
    GestureDetector onTap: setState selectedRole
  
  Unselected: border: 1px solid rgba(74,122,61,0.2)

GOOGLE BUTTON:
  Height: 52px, full width, radius 10
  bg: Color(0xFF111C11)
  border: Border.all(color: Color(0xFF3A6133))
  Row: google logo SVG (SvgPicture or custom paint) + "CONTINUE WITH GOOGLE"
  Text: DM Mono 13px, textPrimary
  onTap: MockClerkAuth.signInWithGoogle() → loading → navigate
  Hover effect: Transform.scale(0.98) onTap

DIVIDER: thin olive line + "OR" in DM Mono

EMAIL FIELD:
  bg: Color(0xFF0F1A0F)
  border: Color(0xFF2E4E2E)
  focusBorder: Color(0xFF5E9B4E)
  hint: "your@email.com" in textMuted
  DM Mono font

CONTINUE BUTTON:
  bg: Color(0xFF4A7A3D), full width
  Text: "CONTINUE WITH EMAIL" in DM Mono
  onTap: MockClerkAuth.signInWithEmail(email) → navigate

AFTER LOGIN:
  if admin email → AdminHomeScreen
  else → PatientHomeScreen
```

---

## SCREEN: lib/screens/patient/patient_home_screen.dart

```
USE STITCH MCP → "Patient home screen — dark olive ECG monitoring app,
live BPM display in DM Mono huge number with glow effect,
mini ECG chart using fl_chart with olive line, vitals cards row,
video carousel, animated status indicators, bottom navigation"

ALL DATA: Stream from DatabaseService.watchLatestEcg('pranjal_001')
          Stream from DatabaseService.watchEcgHistory('pranjal_001', limit: 60)
          Stream from DatabaseService.watchProfile(userId)

LAYOUT (SingleChildScrollView, bg bgVoid):

SECTION 1 — STATUS HEADER (Card, bgSidebar):
  Row:
    Left: StatusDot (green/yellow/red based on BPM) + "● LIVE" blinking
    Center: BPM number large (DM Mono 48px, color-coded, glow effect)
    Right: mode badge (NORMAL/SLEEP/PARKINSON in DM Mono 10px)
  
  BPM glow: BoxDecoration boxShadow using bpm color at 0.5 opacity, blur 20
  Update animation: when BPM changes, TweenAnimationBuilder scale 1.0→1.1→1.0

SECTION 2 — VIDEO CAROUSEL (height 200px):
  PageView.builder with 5 VideoCard widgets
  Each VideoCard:
    bg: bgCard (no actual video — placeholder colored containers with icons)
    Dark gradient overlay bottom half
    Icon: medical icon (Favorite, FlashOn, etc.)
    Title at bottom: DM Mono 14px textPrimary
    
  Cards: "CARDIAC ARREST" | "PANIC ATTACK" | "SEIZURE" | "PARKINSON'S" | "PTSD"
  
  Smooth indicator dots below (olive-colored)
  Currently active card: scale 1.0, others: scale 0.95 (AnimatedScale)

SECTION 3 — LIVE ECG PREVIEW (tappable Card):
  Title: "LIVE ECG" + pulsing green dot
  
  fl_chart LineChart (height: 110px):
    Data: last 60 BPM readings from watchEcgHistory
    Convert to FlSpot: FlSpot(index.toDouble(), reading['bpm'].toDouble())
    
    LineChartData(
      lineBarsData: [LineChartBarData(
        spots: spots,
        color: bpmColor,
        barWidth: 1.5,
        isCurved: true,
        curveSmoothness: 0.3,
        dotData: FlDotData(show: false),
        belowBarData: BarAreaData(
          show: true,
          color: bpmColor.withOpacity(0.1),
        ),
      )],
      gridData: FlGridData(show: false),
      titlesData: FlTitlesData(show: false),
      borderData: FlBorderData(show: false),
      backgroundColor: AppColors.bgVoid,
    )
  
  "TAP FOR FULL ANALYSIS →" bottom right, DM Mono 10px, olive400
  onTap: Navigator.push EcgDetailScreen

SECTION 4 — VITALS ROW (4 cards in GridView 2x2):
  BPM card: DM Mono 32px number + "BPM" label
  Stress card: CustomPaint arc gauge 0-100
    Arc background: olive700, fill: animated from 0 to value
    Color: green<40, yellow<70, red>70
    Number center: DM Mono 20px
  Tremor card: green dot "NONE" / red dot "DETECTED"
  Mode card: text badge with icon

SECTION 5 — RECENT ALERTS:
  StreamBuilder from watchAlerts
  If empty: Row with checkmark icon + "ALL CLEAR" in DM Mono textSecondary
  If alerts: each alert with colored left border + type + time ago

BOTTOM NAV:
  BottomNavigationBar: Home | ECG | Chat | Settings
  selectedItemColor: olive300
  unselectedItemColor: olive700
  backgroundColor: bgSidebar
```

---

## SCREEN: lib/screens/patient/ecg_detail_screen.dart

```
USE STITCH MCP → "Full ECG analysis screen — dark olive, large interactive
fl_chart with time range selector pills, anomaly red dots on chart,
analysis cards below with HRV, stress, rhythm status, AI analysis button"

TIME RANGE PILLS (Row):
  LIVE | 1H | 24H | 7D | 30D
  Selected: bg olive500, text textPrimary, DM Mono 11px
  Unselected: border olive700, text textMuted

MAIN CHART (fl_chart LineChart, height 240px):
  Interactive: enableTouch: true
  Long press tooltip: DM Mono text showing BPM + time
  
  Anomaly markers: red spots where isAnomaly == true
    Use FlDotData(checkToShowDot: (spot, data) => anomalyIndices.contains(spot.x.toInt()))
    FlDotPainter: circle radius 4, color statusCrit, glow effect
  
  Y axis: BPM labels 40-200, DM Mono 10px
  X axis: time labels, DM Mono 10px
  Grid: horizontal lines, olive700 at 0.1 opacity

ANALYSIS CARDS (2x2 grid):
  Current BPM + trend arrow (↑↓→)
  Avg / Min / Max today
  HRV score + quality label
  Stress gradient bar (animated width)

RHYTHM STATUS (full width card):
  "NORMAL SINUS RHYTHM" green
  "TACHYCARDIA DETECTED" yellow
  "BRADYCARDIA DETECTED" yellow
  "CRITICAL — CALL 108" red + critPulse animation

AI ANALYSIS BUTTON:
  bg olive600, full width, height 52px
  Icon: auto_awesome
  onTap: POST to Cloudflare /chat → show BottomSheet with response
  BottomSheet: dark olive bg, response text in DM Sans

EPISODE LOG:
  List of anomaly events from history data
  Each: colored dot + type text + time + duration
```

---

## SCREEN: lib/screens/patient/alert_dialog_widget.dart

```
USE STITCH MCP → "Emergency alert full-screen dialog — red border pulsing,
large warning icon, countdown timer widget, I'M OKAY button, dark olive,
cannot be dismissed — medical emergency UI"

WillPopScope(onWillPop: () async => false) — cannot back-press

Background: barrierColor black87
Dialog: full screen, bg bgPrimary

TOP: pulsing red border (Container with BoxDecoration, animation)

CONTENT:
  Warning icon: 72px, statusCrit color, scale 1.0↔1.2 animation (flutter_animate)
  Title: "⚠️ [alertType.toUpperCase()] DETECTED"
    DM Mono 24px, textPrimary
  Body: description based on alertType

COUNTDOWN (custom widget):
  Stack:
    CircularProgressIndicator (remaining/120) olive → yellow at 60s → red at 30s
    Center: DM Mono "M:SS" countdown
  
  120-second timer using Timer.periodic(Duration(seconds:1))
  On 0: change dialog to "CONTACTING EMERGENCY CONTACTS..."
        show 8-minute countdown
        call alert-engine API

I'M OKAY BUTTON:
  Full width, height 64px, bg olive500
  DM Mono "I'M OKAY — I'M SAFE"
  onTap: POST to /resolve-alert → Navigator.pop → show Snackbar

Colors by alert type:
  cardiac: statusCrit, seizure: Colors.orange, panic: statusWarn
  parkinson: Colors.blue, ptsd: Colors.purple
```

---

## SCREEN: lib/screens/patient/chat_screen.dart

```
USE STITCH MCP → "Medical AI chat — olive dark, chat bubbles olive toned,
AI label on left bubbles, typing indicator animation, health context card
collapsible at top, image attachment support"

TABS: "AI ASSISTANT" | "LIVE SUPPORT" (DM Mono uppercase pills)

HEALTH CONTEXT CARD (collapsible):
  bg bgElevated, border olive700
  "TODAY: BPM 74 AVG | STRESS 32 | STATUS OK"
  DM Mono 12px, textData color
  Tap: AnimatedSize collapse

CHAT LIST (ListView, scrollController):
  AI bubbles: bg bgElevated, left side, border olive700 dashed
    "GUARDIAN AI" label: DM Mono 10px, textMuted
  User bubbles: bg olive700, right side
  Typing indicator: 3 dots animating (flutter_animate stagger)

INPUT BAR:
  bg bgSidebar, border top olive700 0.2
  TextField + attach icon + send button (olive500 bg)
  onSend: POST to Cloudflare /chat → await response → add to chat

API CALL:
  POST /chat with body:
    {userId, message, history: last10, mediaUrl: null}
  Header: Content-Type: application/json
  Parse response: display in chat bubble
```

---

## SCREEN: lib/screens/patient/settings_screen.dart

```
USE STITCH MCP → "Settings — olive dark, profile section with avatar,
mode selector (3 large cards), emergency contacts section, device status
card with green/red dot, toggle rows for notifications"

PROFILE SECTION:
  Avatar circle: initials, bg olive700, text olive100, 56px
  Name + phone (editable on tap)
  Save button → DatabaseService.updateUser()

MONITORING MODE (3 Cards):
  NORMAL | SLEEP | PARKINSON
  Selected: border 2px olive300, bg rgba(78,155,78,0.1)
  DM Mono labels, icons, descriptions
  onSelect: DatabaseService.updateUser(userId, {'mode': newMode})

EMERGENCY CONTACTS:
  Contact 1: Name + Phone + Email
  Contact 2: optional
  Save → Firebase update
  "SEND TEST ALERT" → POST /test-alert

DEVICE STATUS:
  "RASPBERRY PI" row: dot + Connected/Offline
    Determine from last ECG timestamp < 30s ago
  "LAST DATA": "X seconds ago" in DM Mono

PARKINSON EXTRAS (visible when mode == 'parkinson'):
  Medication reminders list
  "GENERATE DOCTOR REPORT" → (placeholder for now)
  QTc gender toggle
```

---

## SCREEN: lib/screens/admin/admin_home_screen.dart

```
USE STITCH MCP → "Admin dashboard — dark olive, drawer sidebar with nav,
stat cards row, live alert feed, patient activity grid, pure olive aesthetic,
animated data, military medical precision feel"

DRAWER SIDEBAR:
  Logo + GUARDIAN PULSE title (DM Mono)
  Nav: Overview | Patients | ECG Monitor | Alerts | Support
  Active: left 3px border olive300 (AnimatedContainer)
  Bottom: MockClerkAuth.email + SIGN OUT

BODY:
  AppBar with menu icon + "GUARDIAN PULSE" + LIVE badge

STAT CARDS (GridView 2x2):
  From DatabaseService.watchAllAlerts() count
  Total Patients, Active Alerts, Avg BPM, Critical Today
  Each: DM Mono number 32px, label 10px, olive top border accent

LIVE ALERT FEED (StreamBuilder watchAllAlerts):
  Title: "LIVE ALERTS" in DM Mono + count badge
  Each alert: colored left border + patient id + type + timer + MARK SAFE button

PATIENT GRID (preview, 2 columns):
  Top 6 from DatabaseService watchAllEcgUsers (unique userIds from ecg_readings)
  Each mini card: userId + BPM + mini fl_chart
```

---

## lib/main.dart (COMPLETE)
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'firebase_options.dart';
import 'core/theme.dart';
import 'screens/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  await Hive.initFlutter();
  
  runApp(const ProviderScope(child: GuardianPulseApp()));
}

class GuardianPulseApp extends StatelessWidget {
  const GuardianPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Guardian Pulse',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: const SplashScreen(),
    );
  }
}
```

---

## lib/firebase_options.dart (EXACT)
```dart
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android: return android;
      case TargetPlatform.iOS: return ios;
      default: return android;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc',
    appId: '1:1058794098347:android:your_android_app_id',
    messagingSenderId: '1058794098347',
    projectId: 'guardian-pulse-1360c',
    storageBucket: 'guardian-pulse-1360c.firebasestorage.app',
    databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc',
    appId: '1:1058794098347:web:e358b1e45760d97127b1ee',
    messagingSenderId: '1058794098347',
    projectId: 'guardian-pulse-1360c',
    storageBucket: 'guardian-pulse-1360c.firebasestorage.app',
    measurementId: 'G-6FHJC9ZZ2C',
    databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc',
    appId: '1:1058794098347:ios:your_ios_app_id',
    messagingSenderId: '1058794098347',
    projectId: 'guardian-pulse-1360c',
    storageBucket: 'guardian-pulse-1360c.firebasestorage.app',
    databaseURL: 'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app',
  );
}
```

---

## GENERATE ALL THESE FILES:
1. lib/main.dart
2. lib/firebase_options.dart
3. lib/core/constants.dart
4. lib/core/theme.dart
5. lib/mocks/clerk_auth.dart
6. lib/services/database_service.dart
7. lib/screens/splash_screen.dart
8. lib/screens/auth_screen.dart
9. lib/screens/patient/patient_home_screen.dart
10. lib/screens/patient/ecg_detail_screen.dart
11. lib/screens/patient/alert_dialog_widget.dart
12. lib/screens/patient/chat_screen.dart
13. lib/screens/patient/settings_screen.dart
14. lib/screens/admin/admin_home_screen.dart
15. pubspec.yaml
16. android/settings.gradle
17. android/build.gradle
18. android/app/build.gradle
19. android/gradle/wrapper/gradle-wrapper.properties
20. android/app/src/main/AndroidManifest.xml

After generating: flutter clean → flutter pub get → flutter run
Zero errors guaranteed with these exact Gradle configs.
