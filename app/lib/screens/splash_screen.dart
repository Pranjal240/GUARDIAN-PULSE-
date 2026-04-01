import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:guardian_pulse/mocks/clerk_auth.dart';
import '../core/constants.dart';
import '../services/database_service.dart';
import '../widgets/logo_widget.dart';
import 'auth_screen.dart';
import 'patient/patient_home_screen.dart';
import 'admin/admin_home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ecgController;

  @override
  void initState() {
    super.initState();
    _ecgController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..forward();

    // Navigate after 3 seconds
    Future.delayed(const Duration(seconds: 3), _checkAndNavigate);
  }

  Future<void> _checkAndNavigate() async {
    if (!mounted) return;
    final auth = ClerkAuth.optionalOf(context);
    final userId = auth.client?.activeSession?.user?.id;

    if (userId == null) {
      _navigate(const AuthScreen());
      return;
    }

    final profile = await DatabaseService.instance.getProfile(userId);
    if (profile == null || profile['role'] == null) {
      _navigate(const AuthScreen());
    } else if (profile['role'] == kRoleAdmin) {
      _navigate(const AdminHomeScreen());
    } else {
      _navigate(PatientHomeScreen(userId: userId));
    }
  }

  void _navigate(Widget destination) {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => destination,
        transitionDuration: const Duration(milliseconds: 600),
        transitionsBuilder: (_, animation, __, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _ecgController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgApp,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // ── Logo ──────────────────────────────────
              const GuardianPulseLogo(height: 120)
                  .animate()
                  .scale(
                    begin: const Offset(0.8, 0.8),
                    end: const Offset(1.0, 1.0),
                    duration: const Duration(milliseconds: 800),
                    curve: Curves.easeOutBack,
                  )
                  .fade(duration: const Duration(milliseconds: 600)),

              const SizedBox(height: 24),

              // ── ECG Line ──────────────────────────────
              AnimatedBuilder(
                animation: _ecgController,
                builder: (_, __) => CustomPaint(
                  size: const Size(260, 48),
                  painter: _EcgLinePainter(_ecgController.value),
                ),
              ),

              const SizedBox(height: 20),

              // ── Title ─────────────────────────────────
              const Text(
                'Guardian Pulse',
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: kTextPrimary,
                ),
              )
                  .animate(delay: const Duration(milliseconds: 800))
                  .fade(duration: const Duration(milliseconds: 400)),

              const SizedBox(height: 6),

              // ── Tagline ───────────────────────────────
              const Text(
                'Your Life. Monitored.',
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 14,
                  color: kTextAccent,
                ),
              )
                  .animate(delay: const Duration(milliseconds: 1000))
                  .fade(duration: const Duration(milliseconds: 400)),

              const Spacer(),

              // ── Loading dots ──────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(3, (i) {
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: kBeige.withOpacity(0.6),
                      shape: BoxShape.circle,
                    ),
                  )
                      .animate(
                        delay: Duration(milliseconds: 1200 + (i * 150)),
                        onPlay: (c) => c.repeat(reverse: true),
                      )
                      .fadeIn(duration: const Duration(milliseconds: 400))
                      .scale(
                        begin: const Offset(0.5, 0.5),
                        end: const Offset(1.2, 1.2),
                      );
                }),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}

/// ECG line CustomPainter — draws left → right
class _EcgLinePainter extends CustomPainter {
  final double progress;
  const _EcgLinePainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = kBeige
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // ECG keypoints as fractions of width
    final points = [
      Offset(0, size.height * 0.5),
      Offset(size.width * 0.15, size.height * 0.5),
      Offset(size.width * 0.25, size.height * 0.5),
      Offset(size.width * 0.3, size.height * 0.2),
      Offset(size.width * 0.35, size.height * 0.8),
      Offset(size.width * 0.4, size.height * 0.1),
      Offset(size.width * 0.45, size.height * 0.6),
      Offset(size.width * 0.52, size.height * 0.5),
      Offset(size.width * 0.65, size.height * 0.5),
      Offset(size.width * 0.7, size.height * 0.35),
      Offset(size.width * 0.75, size.height * 0.5),
      Offset(size.width, size.height * 0.5),
    ];

    // Clip to progress
    final clipX = size.width * progress;
    canvas.clipRect(Rect.fromLTWH(0, 0, clipX, size.height));

    final path = Path();
    path.moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(path, paint);

    // Subtle glow
    if (progress > 0.1) {
      final glowPaint = Paint()
        ..color = kBeige.withOpacity(0.15)
        ..strokeWidth = 8.0
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
      canvas.drawPath(path, glowPaint);
    }
  }

  @override
  bool shouldRepaint(_EcgLinePainter old) => old.progress != progress;
}
