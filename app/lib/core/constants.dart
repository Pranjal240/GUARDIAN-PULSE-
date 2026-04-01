import 'package:flutter/material.dart';

/// ══════════════════════════════════════════════════
/// Guardian Pulse — App Constants
/// Single source of truth for colors, URLs, and strings
/// ══════════════════════════════════════════════════

// ─── Firebase / Backend ───────────────────────────
const String kFirebaseApiKey     = 'AIzaSyBR6YEX8I_nIXkxOm33e9ij0Y-jQDgT1xc';
const String kFirebaseProjectId  = 'guardian-pulse-1360c';
const String kFirebaseDbUrl      =
    'https://guardian-pulse-1360c-default-rtdb.asia-southeast1.firebasedatabase.app';
const String kCloudflareUrl      =
    'https://guardian-pulse-api.pranjalmishra2409.workers.dev';
const String kR2PublicUrl        =
    'https://pub-aa8892880b7d4eb893a3d4d288bd266a.r2.dev';
const String kClerkPublishableKey =
    'pk_test_YWxsb3dpbmctY3ViLTc1LmNsZXJrLmFjY291bnRzLmRldiQ';

// ─── Roles ────────────────────────────────────────
const String kAdminEmail        = 'pranjalmishra2409@gmail.com';
const String kRoleAdmin         = 'admin';
const String kRolePatient       = 'patient';

// ─── RTDB paths ───────────────────────────────────
const String kDbUsers           = 'users';
const String kDbEcgReadings     = 'ecg_readings';
const String kDbMotionData      = 'motion_data';
const String kDbAlerts          = 'alerts';
const String kDbChatMessages    = 'chat_messages';

// ─── Primary Backgrounds ──────────────────────────
const Color kBgApp              = Color(0xFF1C2B1E); // very dark olive
const Color kBgCard             = Color(0xFF2A3D2E); // dark olive card
const Color kBgNav              = Color(0xFF223026); // deep forest nav
const Color kBgModal            = Color(0xFF243529); // modal / sheet
const Color kBgInput            = Color(0xFF1E2F22); // input fields

// ─── Beige Accent ─────────────────────────────────
const Color kBeige              = Color(0xFFD4B896); // warm beige — primary CTA
const Color kBeigeHover         = Color(0xFFC4A882); // slightly deeper
const Color kBeigeMuted         = Color(0xFFB89A6E); // muted gold-beige

// ─── Olive Accent ─────────────────────────────────
const Color kOlive              = Color(0xFF4A6741); // mid olive
const Color kOliveMuted         = Color(0xFF3D5738); // borders / dividers
const Color kOliveBright        = Color(0xFF5B7F52); // hover states

// ─── Text ─────────────────────────────────────────
const Color kTextPrimary        = Color(0xFFF2E8D9); // warm cream white
const Color kTextSecondary      = Color(0xFFA8B5A2); // muted sage
const Color kTextMuted          = Color(0xFF6B7F67); // labels
const Color kTextAccent         = Color(0xFFD4B896); // beige highlights

// ─── Status Colors ────────────────────────────────
const Color kAlertRed           = Color(0xFFE05252);
const Color kWarningAmber       = Color(0xFFE8A838);
const Color kSuccessGreen       = Color(0xFF5CB85C);
const Color kInfoBlue           = Color(0xFF5B9BD5);
const Color kPurple             = Color(0xFF9B7EC8);

// ─── Card BoxDecoration ───────────────────────────
BoxDecoration kCardDecoration = BoxDecoration(
  color: kBgCard,
  borderRadius: BorderRadius.circular(16),
  border: Border.all(color: kBeige.withOpacity(0.12)),
  boxShadow: [
    BoxShadow(
      color: Colors.black.withOpacity(0.4),
      blurRadius: 24,
      offset: const Offset(0, 4),
    ),
  ],
);

BoxDecoration kCardDecorationCritical = BoxDecoration(
  color: kBgCard,
  borderRadius: BorderRadius.circular(16),
  border: Border.all(color: kAlertRed.withOpacity(0.5)),
  boxShadow: [
    BoxShadow(
      color: kAlertRed.withOpacity(0.25),
      blurRadius: 20,
    ),
  ],
);

// ─── Gradient Decorations ─────────────────────────
const LinearGradient kBeigeGradient = LinearGradient(
  colors: [kBeige, kBeigeMuted],
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
);

const LinearGradient kHeroGradient = LinearGradient(
  colors: [kBgApp, kBgCard],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

const LinearGradient kAlertGradient = LinearGradient(
  colors: [Color(0xFF3D1A1A), kBgCard],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// ─── Spacing ──────────────────────────────────────
const double kPad               = 20.0;
const double kPadSm             = 12.0;
const double kPadXs             = 8.0;
const double kCardRadius        = 16.0;
const double kBtnRadius         = 12.0;
const double kInputRadius       = 10.0;
const double kCardGap           = 16.0;

// ─── Assets ───────────────────────────────────────
const String kLogoApp           = 'assets/logo/APP LOGO.png';
const String kLogoWebsite       = 'assets/logo/WEBSITE LOGO.png';

// ─── Performance Limits ───────────────────────────
const int kEcgQueryLimit        = 60;
const int kEcgCacheLimit        = 100;
const int kChatHistoryLimit     = 50;
