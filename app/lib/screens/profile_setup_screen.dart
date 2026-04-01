import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import '../core/constants.dart';
import '../services/database_service.dart';
import '../widgets/logo_widget.dart';
import 'patient/patient_home_screen.dart';

class ProfileSetupScreen extends StatefulWidget {
  final String userId;
  final String email;

  const ProfileSetupScreen({
    super.key,
    required this.userId,
    required this.email,
  });

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _contact1NameCtrl = TextEditingController();
  final _contact1PhoneCtrl = TextEditingController();
  final _contact1EmailCtrl = TextEditingController();
  final _contact2NameCtrl = TextEditingController();
  final _contact2PhoneCtrl = TextEditingController();
  bool _agreed = false;
  bool _isLoading = false;

  @override
  void dispose() {
    for (final c in [
      _nameCtrl, _phoneCtrl, _contact1NameCtrl, _contact1PhoneCtrl,
      _contact1EmailCtrl, _contact2NameCtrl, _contact2PhoneCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please agree to the terms to continue.'),
          backgroundColor: kAlertRed,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await DatabaseService.instance.writeProfile(widget.userId, {
        'userId': widget.userId,
        'email': widget.email,
        'role': kRolePatient,
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'mode': 'normal',
        'emergencyContact1Name': _contact1NameCtrl.text.trim(),
        'emergencyContact1Phone': _contact1PhoneCtrl.text.trim(),
        'emergencyContact1Email': _contact1EmailCtrl.text.trim(),
        'emergencyContact2Name': _contact2NameCtrl.text.trim(),
        'emergencyContact2Phone': _contact2PhoneCtrl.text.trim(),
        'consentGiven': true,
        'createdAt': ServerValue.timestamp,
      });

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => PatientHomeScreen(userId: widget.userId),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save profile: $e'),
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
      appBar: AppBar(
        backgroundColor: kBgApp,
        elevation: 0,
        title: const GuardianPulseLogo(height: 32, showText: true),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(kPad),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ────────────────────────────────
              const Text(
                'Set up your profile',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: kTextPrimary,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'This information helps us protect you better.',
                style: TextStyle(fontSize: 13, color: kTextSecondary),
              ),

              const SizedBox(height: 28),

              // ── Personal Info ───────────────────────
              _sectionLabel('Personal Information'),
              const SizedBox(height: 12),
              _buildField('Full Name', _nameCtrl, Icons.person_outline,
                  validator: _required),
              const SizedBox(height: 12),
              _buildField('Phone Number (+91)', _phoneCtrl, Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                  validator: _required),

              const SizedBox(height: 24),

              // ── Emergency Contact 1 ─────────────────
              _sectionLabel('Emergency Contact 1 *'),
              const SizedBox(height: 12),
              _buildField('Name', _contact1NameCtrl, Icons.person_outline,
                  validator: _required),
              const SizedBox(height: 12),
              _buildField('Phone', _contact1PhoneCtrl, Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                  validator: _required),
              const SizedBox(height: 12),
              _buildField('Email', _contact1EmailCtrl, Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                  validator: _required),

              const SizedBox(height: 24),

              // ── Emergency Contact 2 (optional) ──────
              _sectionLabel('Emergency Contact 2 (optional)'),
              const SizedBox(height: 12),
              _buildField('Name', _contact2NameCtrl, Icons.person_outline),
              const SizedBox(height: 12),
              _buildField('Phone', _contact2PhoneCtrl, Icons.phone_outlined,
                  keyboardType: TextInputType.phone),

              const SizedBox(height: 28),

              // ── Agreement ────────────────────────────
              GestureDetector(
                onTap: () => setState(() => _agreed = !_agreed),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: _agreed ? kBeige : Colors.transparent,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: _agreed ? kBeige : kOliveMuted,
                          width: 1.5,
                        ),
                      ),
                      child: _agreed
                          ? const Icon(Icons.check, size: 14, color: kBgApp)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'I agree to Guardian Pulse\'s Terms of Service, '
                        'Privacy Policy, and consent to health data monitoring.',
                        style: const TextStyle(
                          fontSize: 12,
                          color: kTextSecondary,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // ── Submit ───────────────────────────────
              GestureDetector(
                onTap: _isLoading ? null : _saveProfile,
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
                    child: _isLoading
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: kBgApp,
                            ),
                          )
                        : const Text(
                            'Get Started →',
                            style: TextStyle(
                              color: kBgApp,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 16,
          decoration: BoxDecoration(
            color: kBeige,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: kTextAccent,
          ),
        ),
      ],
    );
  }

  Widget _buildField(
    String label,
    TextEditingController controller,
    IconData icon, {
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: kTextPrimary, fontSize: 14),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18),
      ),
    );
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required' : null;
}
