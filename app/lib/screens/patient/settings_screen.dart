import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:firebase_database/firebase_database.dart';
import '../../core/constants.dart';
import '../../providers/sensor_providers.dart';
import '../../services/database_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  final String userId;
  const SettingsScreen({super.key, required this.userId});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  String _selectedMode = 'normal';
  bool _isSaving = false;

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emergencyCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final profile = await DatabaseService.instance.getProfile(widget.userId);
    if (profile != null && mounted) {
      setState(() {
        _nameCtrl.text = profile['name'] as String? ?? '';
        _phoneCtrl.text = profile['phone'] as String? ?? '';
        _emergencyCtrl.text = profile['emergencyContact1Phone'] as String? ?? '';
        _selectedMode = profile['mode'] as String? ?? 'normal';
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    try {
      await DatabaseService.instance.updateProfile(widget.userId, {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'emergencyContact1Phone': _emergencyCtrl.text.trim(),
        'mode': _selectedMode,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile saved successfully'),
            backgroundColor: kSuccessGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: kAlertRed),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emergencyCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isPiOn = ref.watch(isPiConnectedProvider(widget.userId));
    final profileAsync = ref.watch(userProfileProvider(widget.userId));

    return Scaffold(
      backgroundColor: kBgApp,
      appBar: AppBar(
        title: const Text('Settings'),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(kPad),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Profile Header ───────────────────────
            profileAsync.when(
              data: (profile) => _ProfileHeader(
                name: profile?['name'] as String? ?? 'User',
                email: profile?['email'] as String? ?? '',
              ).animate().fade(duration: 400.ms),
              loading: () => const CircularProgressIndicator(color: kBeige),
              error: (_, __) => const SizedBox(),
            ),

            const SizedBox(height: 24),

            // ── Profile Edit ─────────────────────────
            _sectionLabel('Profile'),
            const SizedBox(height: 12),
            TextField(
              controller: _nameCtrl,
              style: const TextStyle(color: kTextPrimary),
              decoration: const InputDecoration(
                labelText: 'Full Name',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneCtrl,
              style: const TextStyle(color: kTextPrimary),
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emergencyCtrl,
              style: const TextStyle(color: kTextPrimary),
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Emergency Contact Phone',
                prefixIcon: Icon(Icons.emergency_outlined),
              ),
            ),

            const SizedBox(height: 24),

            // ── Monitoring Mode ──────────────────────
            _sectionLabel('Monitoring Mode'),
            const SizedBox(height: 12),

            Row(
              children: [
                _ModeCard(
                  icon: '🟢',
                  label: 'Normal',
                  value: 'normal',
                  selected: _selectedMode,
                  onTap: () => setState(() => _selectedMode = 'normal'),
                ),
                const SizedBox(width: kPadSm),
                _ModeCard(
                  icon: '🌙',
                  label: 'Sleep',
                  value: 'sleep',
                  selected: _selectedMode,
                  onTap: () => setState(() => _selectedMode = 'sleep'),
                ),
                const SizedBox(width: kPadSm),
                _ModeCard(
                  icon: '🧠',
                  label: 'Parkinson',
                  value: 'parkinson',
                  selected: _selectedMode,
                  onTap: () => setState(() => _selectedMode = 'parkinson'),
                ),
              ],
            ).animate(delay: 200.ms).fade(),

            const SizedBox(height: 24),

            // ── Device Status ────────────────────────
            _sectionLabel('Device Status'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: kCardDecoration,
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: isPiOn ? kSuccessGreen : kTextMuted,
                      shape: BoxShape.circle,
                      boxShadow: isPiOn
                          ? [BoxShadow(color: kSuccessGreen.withOpacity(0.5), blurRadius: 6)]
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    isPiOn ? 'Raspberry Pi — Connected' : 'Raspberry Pi — Offline',
                    style: TextStyle(
                      color: isPiOn ? kSuccessGreen : kTextMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // ── Save Button ──────────────────────────
            GestureDetector(
              onTap: _isSaving ? null : _saveProfile,
              child: Container(
                height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [kBeige, kBeigeMuted]),
                  borderRadius: BorderRadius.circular(kBtnRadius),
                  boxShadow: [BoxShadow(color: kBeige.withOpacity(0.3), blurRadius: 16)],
                ),
                child: Center(
                  child: _isSaving
                      ? const CircularProgressIndicator(color: kBgApp, strokeWidth: 2)
                      : const Text(
                          'Save Changes',
                          style: TextStyle(
                            color: kBgApp,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                ),
              ).animate(delay: 300.ms).fade(),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Row(
        children: [
          Container(
            width: 3,
            height: 16,
            decoration: BoxDecoration(color: kBeige, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(width: 8),
          Text(text,
              style: const TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w600, color: kTextAccent)),
        ],
      );
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String email;
  const _ProfileHeader({required this.name, required this.email});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(kPad),
      decoration: kCardDecoration,
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: kOlive,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'U',
              style: const TextStyle(
                  fontSize: 24, fontWeight: FontWeight.bold, color: kBeige),
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 17,
                      color: kTextPrimary)),
              const SizedBox(height: 2),
              Text(email, style: const TextStyle(fontSize: 12, color: kTextMuted)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final String icon, label, value, selected;
  final VoidCallback onTap;

  const _ModeCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = value == selected;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isSelected ? kBeige.withOpacity(0.1) : kBgCard,
            borderRadius: BorderRadius.circular(kCardRadius),
            border: Border.all(
              color: isSelected ? kBeige : kOliveMuted,
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: kBeige.withOpacity(0.2), blurRadius: 16)]
                : null,
          ),
          child: Column(
            children: [
              Text(icon, style: const TextStyle(fontSize: 22)),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? kBeige : kTextSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
