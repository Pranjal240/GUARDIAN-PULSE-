import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:guardian_pulse/mocks/clerk_auth.dart';
import '../core/constants.dart';
import '../services/database_service.dart';
import '../widgets/logo_widget.dart';
import 'profile_setup_screen.dart';
import 'patient/patient_home_screen.dart';
import 'admin/admin_home_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  String _selectedRole = kRolePatient;
  final _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _checkProfileAndNavigate(String userId, String email) async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final profile = await DatabaseService.instance.getProfile(userId);

      // Auto-assign admin role if admin email
      if (email == kAdminEmail) {
        if (profile == null || profile['role'] == null) {
          await DatabaseService.instance.writeProfile(userId, {
            'userId': userId,
            'email': email,
            'role': kRoleAdmin,
            'createdAt': ServerValue.timestamp,
          });
        }
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const AdminHomeScreen()),
          );
        }
        return;
      }

      // New user → profile setup
      if (profile == null || profile['name'] == null) {
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => ProfileSetupScreen(userId: userId, email: email),
            ),
          );
        }
        return;
      }

      // Existing patient
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => PatientHomeScreen(userId: userId)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: kAlertRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgApp,
      body: SafeArea(
        child: ClerkAuth.optionalOf(context)?.user != null
            ? _buildAlreadySignedIn(context)
            : _buildLoginContent(context),
      ),
    );
  }

  Widget _buildAlreadySignedIn(BuildContext context) {
    final user = ClerkAuth.optionalOf(context)!.user!;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(color: kBeige),
          const SizedBox(height: 16),
          Text('Welcome back, ${user.firstName ?? 'User'}!',
              style: const TextStyle(color: kTextPrimary)),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () => _checkProfileAndNavigate(
              user.id,
              user.primaryEmailAddress?.emailAddress ?? '',
            ),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginContent(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(kPad),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: 24),

          // ── Logo ────────────────────────────────────
          const GuardianPulseLogo(height: 70)
              .animate()
              .fade(duration: 600.ms)
              .scale(begin: const Offset(0.85, 0.85)),

          const SizedBox(height: 16),

          const Text(
            'Guardian Pulse',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: kTextPrimary,
            ),
          ).animate(delay: 200.ms).fade(),

          const SizedBox(height: 6),

          const Text(
            'Medical monitoring for those who care',
            style: TextStyle(fontSize: 13, color: kTextSecondary),
            textAlign: TextAlign.center,
          ).animate(delay: 300.ms).fade(),

          const SizedBox(height: 32),

          // ── Role Selector ───────────────────────────
          Row(
            children: [
              _RoleCard(
                icon: '🏥',
                title: 'Patient',
                subtitle: 'Personal monitoring',
                isSelected: _selectedRole == kRolePatient,
                onTap: () => setState(() => _selectedRole = kRolePatient),
              ),
              const SizedBox(width: kCardGap),
              _RoleCard(
                icon: '👨‍⚕️',
                title: 'Admin',
                subtitle: 'Full control panel',
                isSelected: _selectedRole == kRoleAdmin,
                onTap: () => setState(() => _selectedRole = kRoleAdmin),
              ),
            ],
          ).animate(delay: 400.ms).fade().slideY(begin: 0.1),

          const SizedBox(height: 28),

          // ── Google Login ─────────────────────────────
          ClerkSignInWithOAuthButton(
            strategy: OAuthStrategy.google,
            builder: (context, signIn, isLoading) {
              return _buildPrimaryButton(
                onTap: () async {
                  await signIn();
                  if (!mounted) return;
                  final user = ClerkAuth.optionalOf(context)?.user;
                  if (user != null) {
                    await _checkProfileAndNavigate(
                      user.id,
                      user.primaryEmailAddress?.emailAddress ?? '',
                    );
                  }
                },
                isLoading: isLoading || _isLoading,
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('G', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: kBgApp)),
                    SizedBox(width: 10),
                    Text('Continue with Google', style: TextStyle(color: kBgApp, fontWeight: FontWeight.w600, fontSize: 15)),
                  ],
                ),
              );
            },
          ).animate(delay: 500.ms).fade().slideY(begin: 0.1),

          const SizedBox(height: 20),

          // ── Divider ──────────────────────────────────
          Row(
            children: [
              Expanded(child: Divider(color: kOliveMuted.withOpacity(0.5))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('or', style: TextStyle(color: kTextMuted, fontSize: 13)),
              ),
              Expanded(child: Divider(color: kOliveMuted.withOpacity(0.5))),
            ],
          ).animate(delay: 550.ms).fade(),

          const SizedBox(height: 20),

          // ── Email Field ──────────────────────────────
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: kTextPrimary),
            decoration: const InputDecoration(
              hintText: 'Enter your email address',
              prefixIcon: Icon(Icons.email_outlined),
            ),
          ).animate(delay: 600.ms).fade(),

          const SizedBox(height: 12),

          // ── Email CTA ────────────────────────────────
          ClerkSignInWithEmailButton(
            email: _emailController.text,
            builder: (context, signIn, isLoading) {
              return OutlinedButton(
                onPressed: isLoading || _isLoading
                    ? null
                    : () async {
                        if (_emailController.text.trim().isEmpty) return;
                        await signIn(_emailController.text.trim());
                        if (!mounted) return;
                        final user = ClerkAuth.optionalOf(context)?.user;
                        if (user != null) {
                          await _checkProfileAndNavigate(
                            user.id,
                            user.primaryEmailAddress?.emailAddress ?? '',
                          );
                        }
                      },
                child: isLoading || _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: kBeige,
                        ),
                      )
                    : const Text('Continue with Email'),
              );
            },
          ).animate(delay: 650.ms).fade(),

          const SizedBox(height: 32),

          Text(
            'By continuing, you agree to Guardian Pulse\'s Terms of Service\nand Privacy Policy.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: kTextMuted, height: 1.5),
          ).animate(delay: 700.ms).fade(),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildPrimaryButton({
    required VoidCallback onTap,
    required Widget child,
    bool isLoading = false,
  }) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [kBeige, kBeigeMuted],
          ),
          borderRadius: BorderRadius.circular(kBtnRadius),
          boxShadow: [
            BoxShadow(
              color: kBeige.withOpacity(0.3),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: kBgApp),
                )
              : child,
        ),
      ),
    );
  }
}

// ── Role Card Widget ──────────────────────────────
class _RoleCard extends StatelessWidget {
  final String icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected
                ? kBeige.withOpacity(0.1)
                : kBgCard,
            borderRadius: BorderRadius.circular(kCardRadius),
            border: Border.all(
              color: isSelected ? kBeige : kOliveMuted,
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: kBeige.withOpacity(0.15), blurRadius: 12)]
                : null,
          ),
          child: Column(
            children: [
              Text(icon, style: const TextStyle(fontSize: 28)),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: isSelected ? kBeige : kTextPrimary,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 11, color: kTextSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
