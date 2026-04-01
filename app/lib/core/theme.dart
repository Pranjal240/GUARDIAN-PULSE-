import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'constants.dart';

/// ══════════════════════════════════════════════════
/// Guardian Pulse — App Theme
/// Beige + Olive dark premium medical dashboard theme
/// ══════════════════════════════════════════════════

class AppTheme {
  AppTheme._();

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: kBgApp,
        colorScheme: const ColorScheme.dark(
          primary: kBeige,
          secondary: kOlive,
          surface: kBgCard,
          background: kBgApp,
          onPrimary: kBgApp,
          onSecondary: kTextPrimary,
          onSurface: kTextPrimary,
          onBackground: kTextPrimary,
          error: kAlertRed,
        ),

        // ── Typography ──────────────────────────────
        textTheme: GoogleFonts.poppinsTextTheme().copyWith(
          displayLarge: GoogleFonts.poppins(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: kTextPrimary,
          ),
          displayMedium: GoogleFonts.poppins(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: kTextPrimary,
          ),
          displaySmall: GoogleFonts.poppins(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: kTextPrimary,
          ),
          headlineMedium: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: kTextPrimary,
          ),
          headlineSmall: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: kTextPrimary,
          ),
          titleLarge: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: kTextPrimary,
          ),
          titleMedium: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: kTextPrimary,
          ),
          bodyLarge: GoogleFonts.poppins(
            fontSize: 16,
            color: kTextPrimary,
          ),
          bodyMedium: GoogleFonts.poppins(
            fontSize: 14,
            color: kTextPrimary,
          ),
          bodySmall: GoogleFonts.poppins(
            fontSize: 12,
            color: kTextSecondary,
          ),
          labelLarge: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: kBgApp,
          ),
          labelSmall: GoogleFonts.poppins(
            fontSize: 10,
            color: kTextMuted,
          ),
        ),

        // ── Cards ───────────────────────────────────
        cardTheme: CardThemeData(
          color: kBgCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(kCardRadius),
            side: BorderSide(color: kBeige.withOpacity(0.12)),
          ),
          margin: EdgeInsets.zero,
        ),

        // ── AppBar ──────────────────────────────────
        appBarTheme: AppBarTheme(
          backgroundColor: kBgApp,
          foregroundColor: kTextPrimary,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: kTextPrimary,
          ),
          iconTheme: const IconThemeData(color: kBeige),
        ),

        // ── Elevated Button (Beige gradient style) ──
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: kBeige,
            foregroundColor: kBgApp,
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(kBtnRadius),
            ),
            textStyle: GoogleFonts.poppins(
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
            elevation: 0,
          ),
        ),

        // ── Outlined Button ─────────────────────────
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: kBeige,
            side: const BorderSide(color: kBeige, width: 1.5),
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(kBtnRadius),
            ),
            textStyle: GoogleFonts.poppins(
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
        ),

        // ── Text Button ─────────────────────────────
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: kBeige,
            textStyle: GoogleFonts.poppins(fontWeight: FontWeight.w500),
          ),
        ),

        // ── Input Fields ────────────────────────────
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: kBgInput,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(kInputRadius),
            borderSide: BorderSide(color: kBeige.withOpacity(0.2)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(kInputRadius),
            borderSide: BorderSide(color: kBeige.withOpacity(0.2)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(kInputRadius),
            borderSide: const BorderSide(color: kBeige, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(kInputRadius),
            borderSide: const BorderSide(color: kAlertRed),
          ),
          labelStyle: const TextStyle(color: kBeige),
          hintStyle: TextStyle(color: kTextMuted),
          prefixIconColor: kTextSecondary,
          suffixIconColor: kTextSecondary,
        ),

        // ── Bottom Nav ──────────────────────────────
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: kBgNav,
          selectedItemColor: kBeige,
          unselectedItemColor: kTextMuted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),

        // ── Divider ─────────────────────────────────
        dividerTheme: DividerThemeData(
          color: kOliveMuted.withOpacity(0.5),
          thickness: 1,
        ),

        // ── Icon ────────────────────────────────────
        iconTheme: const IconThemeData(
          color: kTextSecondary,
          size: 22,
        ),

        // ── Switch ──────────────────────────────────
        switchTheme: SwitchThemeData(
          thumbColor: MaterialStateProperty.resolveWith((states) {
            if (states.contains(MaterialState.selected)) return kBeige;
            return kTextMuted;
          }),
          trackColor: MaterialStateProperty.resolveWith((states) {
            if (states.contains(MaterialState.selected)) {
              return kBeige.withOpacity(0.3);
            }
            return kOliveMuted.withOpacity(0.4);
          }),
        ),

        // ── Checkbox ────────────────────────────────
        checkboxTheme: CheckboxThemeData(
          fillColor: MaterialStateProperty.resolveWith((states) {
            if (states.contains(MaterialState.selected)) return kBeige;
            return Colors.transparent;
          }),
          checkColor: MaterialStateProperty.all(kBgApp),
          side: BorderSide(color: kBeige.withOpacity(0.5)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      );

  /// JetBrains Mono style for BPM and data numbers
  static TextStyle monoNumber({
    double size = 32,
    Color color = kTextPrimary,
    FontWeight weight = FontWeight.bold,
  }) {
    return TextStyle(
      fontFamily: 'monospace',
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: -0.5,
      height: 1.0,
    );
  }

  /// Badge / pill style
  static BoxDecoration pillDecoration({Color? color, Color? border}) {
    return BoxDecoration(
      color: (color ?? kOlive).withOpacity(0.2),
      borderRadius: BorderRadius.circular(50),
      border: Border.all(color: border ?? kOlive, width: 1),
    );
  }
}
