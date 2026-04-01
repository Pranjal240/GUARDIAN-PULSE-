import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:guardian_pulse/mocks/clerk_auth.dart';
import '../../core/constants.dart';
import '../../providers/sensor_providers.dart';
import '../../services/database_service.dart';
import '../../widgets/logo_widget.dart';
import '../../widgets/ecg_chart_widget.dart';
import '../../widgets/vitals_card_widget.dart';
import '../auth_screen.dart';

class AdminHomeScreen extends ConsumerStatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  ConsumerState<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends ConsumerState<AdminHomeScreen> {
  int _currentSection = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey();

  static const _navItems = [
    _SideNavItem(icon: Icons.dashboard_rounded, label: 'Dashboard'),
    _SideNavItem(icon: Icons.people_alt_rounded, label: 'Patients'),
    _SideNavItem(icon: Icons.monitor_heart_rounded, label: 'ECG Monitor'),
    _SideNavItem(icon: Icons.warning_rounded, label: 'Alerts'),
    _SideNavItem(icon: Icons.support_agent_rounded, label: 'Support Chat'),
  ];

  Future<void> _signOut() async {
    await ClerkAuth.of(context)?.signOut();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const AuthScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: kBgApp,
      drawer: _buildSidebar(context),
      appBar: AppBar(
        backgroundColor: kBgApp,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: kBeige),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: const GuardianPulseLogo(height: 32, showText: true),
        centerTitle: false,
        actions: [
          Consumer(builder: (_, ref, __) {
            final count = ref.watch(pendingAlertsCountProvider);
            return Stack(
              children: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: kBeige),
                  onPressed: () => setState(() => _currentSection = 3),
                ),
                if (count > 0)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: kAlertRed,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$count',
                        style: const TextStyle(fontSize: 10, color: Colors.white),
                      ),
                    ),
                  ),
              ],
            );
          }),
          const SizedBox(width: 8),
        ],
      ),
      body: IndexedStack(
        index: _currentSection,
        children: [
          _DashboardSection(),
          _PatientsSection(),
          _EcgMonitorSection(),
          _AlertsSection(),
          _SupportChatSection(),
        ],
      ),
    );
  }

  Widget _buildSidebar(BuildContext context) {
    final user = ClerkAuth.optionalOf(context).user;

    return Drawer(
      backgroundColor: kBgNav,
      width: 240,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(kPad),
              child: const GuardianPulseLogo(height: 40, showText: true),
            ),
            Divider(color: kOliveMuted.withOpacity(0.5), height: 1),
            const SizedBox(height: 12),

            // Nav items
            ..._navItems.asMap().entries.map((e) {
              final isActive = e.key == _currentSection;
              return GestureDetector(
                onTap: () {
                  setState(() => _currentSection = e.key);
                  Navigator.of(context).pop();
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  decoration: BoxDecoration(
                    color: isActive ? kBgCard : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    border: isActive
                        ? Border(left: const BorderSide(color: kBeige, width: 3))
                        : null,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        e.value.icon,
                        size: 20,
                        color: isActive ? kBeige : kTextSecondary,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        e.value.label,
                        style: TextStyle(
                          color: isActive ? kBeige : kTextSecondary,
                          fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

            const Spacer(),

            // Admin profile + sign out
            Padding(
              padding: const EdgeInsets.all(kPad),
              child: Column(
                children: [
                  Divider(color: kOliveMuted.withOpacity(0.5)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: kOlive,
                        child: Text(
                          user?.firstName?.substring(0, 1).toUpperCase() ?? 'A',
                          style: const TextStyle(color: kBeige, fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          user?.fullName ?? 'Admin',
                          style: const TextStyle(
                              fontSize: 13,
                              color: kTextPrimary,
                              fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _signOut,
                    icon: const Icon(Icons.logout_rounded, size: 16),
                    label: const Text('Sign Out'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 40),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Dashboard Section ────────────────────────────────
class _DashboardSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patientsAsync = ref.watch(allPatientsProvider);
    final alertsAsync = ref.watch(allAlertsProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(kPad),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Dashboard',
              style: TextStyle(
                  fontSize: 22, fontWeight: FontWeight.bold, color: kTextPrimary)),
          Text(DateFormat('MMMM d, y').format(DateTime.now()),
              style: const TextStyle(fontSize: 13, color: kTextSecondary)),

          const SizedBox(height: 20),

          // ── Stat Cards Row ─────────────────────────
          Row(
            children: [
              _StatCard(
                label: 'Patients',
                value: patientsAsync.when(
                  data: (list) => '${list.length}',
                  loading: () => '--',
                  error: (_, __) => '--',
                ),
                icon: Icons.people_alt_rounded,
                color: kBeige,
              ),
              const SizedBox(width: kCardGap),
              _StatCard(
                label: 'Active Alerts',
                value: alertsAsync.when(
                  data: (list) =>
                      '${list.where((a) => a['status'] == 'pending').length}',
                  loading: () => '--',
                  error: (_, __) => '--',
                ),
                icon: Icons.warning_rounded,
                color: kAlertRed,
                isCritical: alertsAsync.when(
                  data: (list) =>
                      list.any((a) => a['status'] == 'pending'),
                  loading: () => false,
                  error: (_, __) => false,
                ),
              ),
            ],
          ).animate().fade(duration: 400.ms),

          const SizedBox(height: 20),

          // ── Live Alert Feed ────────────────────────
          const Text('Live Alerts',
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w600, color: kTextPrimary)),
          const SizedBox(height: 12),
          alertsAsync.when(
            data: (alerts) {
              final pending = alerts.where((a) => a['status'] == 'pending').toList();
              if (pending.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(kPad),
                  decoration: BoxDecoration(
                    color: kBgCard,
                    borderRadius: BorderRadius.circular(kCardRadius),
                    border: Border.all(color: kSuccessGreen.withOpacity(0.3)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle_outline, color: kSuccessGreen),
                      SizedBox(width: 12),
                      Text('No active alerts', style: TextStyle(color: kSuccessGreen)),
                    ],
                  ),
                );
              }
              return Column(
                children: pending.take(5).map((alert) {
                  return _AdminAlertCard(alert: alert);
                }).toList(),
              );
            },
            loading: () => const SkeletonLoaderWidget(height: 80),
            error: (_, __) => const SizedBox(),
          ),

          const SizedBox(height: 20),

          // ── Patient Activity ───────────────────────
          const Text('Patient Activity',
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w600, color: kTextPrimary)),
          const SizedBox(height: 12),
          patientsAsync.when(
            data: (patients) => Column(
              children: patients.take(5).map((p) {
                final name = p['name'] as String? ?? 'Unknown';
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: kCardDecoration,
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: kOlive,
                        radius: 20,
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : 'U',
                          style: const TextStyle(color: kBeige, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w500, color: kTextPrimary)),
                            Text(p['mode'] as String? ?? 'normal',
                                style: const TextStyle(fontSize: 11, color: kTextMuted)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: AppTheme_pillDecoration(),
                        child: const Text('Active',
                            style: TextStyle(fontSize: 10, color: kBeige)),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
            loading: () => const SkeletonLoaderWidget(height: 200),
            error: (_, __) => const SizedBox(),
          ),
        ],
      ),
    );
  }

  BoxDecoration AppTheme_pillDecoration() {
    return BoxDecoration(
      color: kOlive.withOpacity(0.2),
      borderRadius: BorderRadius.circular(50),
      border: Border.all(color: kOlive),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool isCritical;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.isCritical = false,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(kPad),
        decoration: BoxDecoration(
          color: kBgCard,
          borderRadius: BorderRadius.circular(kCardRadius),
          border: Border(top: BorderSide(color: color, width: 2)),
          boxShadow: isCritical
              ? [BoxShadow(color: color.withOpacity(0.25), blurRadius: 20)]
              : [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 16)],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: isCritical ? color : kTextPrimary,
              ),
            ),
            Text(label, style: const TextStyle(fontSize: 12, color: kTextMuted)),
          ],
        ),
      ),
    );
  }
}

class _AdminAlertCard extends ConsumerWidget {
  final Map<String, dynamic> alert;
  const _AdminAlertCard({required this.alert});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = alert['alertType'] as String? ?? 'Alert';
    final userId = alert['userId'] as String? ?? '';
    final ts = alert['createdAt'] as int? ?? 0;
    final time = ts > 0
        ? DateFormat.jm().format(DateTime.fromMillisecondsSinceEpoch(ts))
        : '';
    final alertId = alert['_id'] as String? ?? '';

    final isOver2min = ts > 0 &&
        DateTime.now().millisecondsSinceEpoch - ts > 120000;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kBgCard,
        borderRadius: BorderRadius.circular(kCardRadius),
        border: Border(left: BorderSide(color: kAlertRed, width: 3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.emergency_rounded, color: kAlertRed, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(type,
                    style: const TextStyle(
                        color: kTextPrimary, fontWeight: FontWeight.w600)),
                Text(
                  isOver2min ? '⚠️ $time — OVERDUE' : time,
                  style: TextStyle(
                      fontSize: 11,
                      color: isOver2min ? kAlertRed : kTextMuted,
                      fontFamily: isOver2min ? 'monospace' : null),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              if (alertId.isNotEmpty) {
                await DatabaseService.instance.resolveAlert(alertId);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: kSuccessGreen,
              foregroundColor: Colors.white,
              minimumSize: const Size(80, 34),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            child: const Text('Mark Safe', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    )
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .shimmer(
          duration: const Duration(milliseconds: 2000),
          color: kAlertRed.withOpacity(0.05),
        );
  }
}

// ── Patients Section ─────────────────────────────────
class _PatientsSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patientsAsync = ref.watch(allPatientsProvider);

    return patientsAsync.when(
      data: (patients) => ListView.builder(
        padding: const EdgeInsets.all(kPad),
        itemCount: patients.length + 1,
        itemBuilder: (_, i) {
          if (i == 0) {
            return const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Text('All Patients',
                  style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: kTextPrimary)),
            );
          }
          final p = patients[i - 1];
          final name = p['name'] as String? ?? 'Unknown';
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(kPad),
            decoration: kCardDecoration,
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: kOlive,
                  child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                      style: const TextStyle(color: kBeige)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, color: kTextPrimary)),
                      Text(p['phone'] as String? ?? '—',
                          style: const TextStyle(fontSize: 12, color: kTextMuted)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: kOlive.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: kOlive),
                  ),
                  child: Text(p['mode'] as String? ?? 'normal',
                      style: const TextStyle(fontSize: 10, color: kBeige)),
                ),
              ],
            ),
          );
        },
      ),
      loading: () => const Center(child: CircularProgressIndicator(color: kBeige)),
      error: (_, __) => const Center(child: Text('Failed to load')),
    );
  }
}

// ── ECG Monitor (Admin) ───────────────────────────────
class _EcgMonitorSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patientsAsync = ref.watch(allPatientsProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(kPad),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ECG Monitor',
              style: TextStyle(
                  fontSize: 22, fontWeight: FontWeight.bold, color: kTextPrimary)),
          const SizedBox(height: 16),
          patientsAsync.when(
            data: (patients) => GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.1,
                crossAxisSpacing: kCardGap,
                mainAxisSpacing: kCardGap,
              ),
              itemCount: patients.length,
              itemBuilder: (_, i) {
                final p = patients[i];
                final name = p['name'] as String? ?? 'Unknown';
                final uid = p['userId'] as String? ?? '';
                return Consumer(builder: (_, ref, __) {
                  final ecgAsync = ref.watch(ecgReadingsProvider(uid));
                  final bpm = ref.watch(latestBpmProvider(uid));
                  final isCritical = bpm > 130 || (bpm > 0 && bpm < 50);

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: kBgCard,
                      borderRadius: BorderRadius.circular(kCardRadius),
                      border: Border.all(
                        color: isCritical
                            ? kAlertRed
                            : bpm > 100
                                ? kWarningAmber
                                : kBeige.withOpacity(0.15),
                        width: isCritical ? 2 : 1,
                      ),
                      boxShadow: isCritical
                          ? [BoxShadow(
                              color: kAlertRed.withOpacity(0.3),
                              blurRadius: 16,
                            )]
                          : null,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundColor: kOlive,
                              child: Text(
                                name.isNotEmpty ? name[0].toUpperCase() : 'U',
                                style: const TextStyle(
                                    fontSize: 12, color: kBeige, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(name.split(' ').first,
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: kTextPrimary)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ecgAsync.when(
                          data: (readings) => EcgChartWidget(
                            data: readings
                                .map((r) => ((r['rawValue'] as num?) ?? 0).toDouble())
                                .toList(),
                            height: 56,
                            lineColor: isCritical ? kAlertRed : kBeige,
                          ),
                          loading: () => const SkeletonLoaderWidget(height: 56),
                          error: (_, __) => const SizedBox(height: 56),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          bpm == 0 ? '-- BPM' : '$bpm BPM',
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 14,
                            color: isCritical ? kAlertRed : kTextPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  )
                      .animate(onPlay: isCritical ? (c) => c.repeat(reverse: true) : null)
                      .then(delay: const Duration(milliseconds: 500))
                      .shimmer(
                        color: kAlertRed.withOpacity(isCritical ? 0.1 : 0),
                        duration: const Duration(milliseconds: 1500),
                      );
                });
              },
            ),
            loading: () => const Center(child: CircularProgressIndicator(color: kBeige)),
            error: (_, __) => const Text('Error loading patients'),
          ),
        ],
      ),
    );
  }
}

// ── Alerts Section ────────────────────────────────────
class _AlertsSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(allAlertsProvider);

    return alertsAsync.when(
      data: (alerts) => SingleChildScrollView(
        padding: const EdgeInsets.all(kPad),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('Alert Management',
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: kTextPrimary)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: kAlertRed.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${alerts.where((a) => a['status'] == 'pending').length} pending',
                    style: const TextStyle(color: kAlertRed, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...alerts.map((alert) => _AdminAlertCard(alert: alert)).toList(),
          ],
        ),
      ),
      loading: () => const Center(child: CircularProgressIndicator(color: kBeige)),
      error: (_, __) => const Center(child: Text('Failed to load alerts')),
    );
  }
}

// ── Support Chat Section ──────────────────────────────
class _SupportChatSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patientsAsync = ref.watch(allPatientsProvider);

    return Row(
      children: [
        // Left panel — patient list
        Container(
          width: 180,
          decoration: BoxDecoration(
            color: kBgNav,
            border: Border(right: BorderSide(color: kOliveMuted.withOpacity(0.5))),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text('Conversations',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: kTextMuted,
                        letterSpacing: 1)),
              ),
              Expanded(
                child: patientsAsync.when(
                  data: (patients) => ListView.builder(
                    itemCount: patients.length,
                    itemBuilder: (_, i) {
                      final name = patients[i]['name'] as String? ?? 'User';
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: kOlive,
                              child: Text(
                                name.isNotEmpty ? name[0].toUpperCase() : 'U',
                                style: const TextStyle(fontSize: 12, color: kBeige),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                name.split(' ').first,
                                style: const TextStyle(
                                    color: kTextPrimary, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  loading: () => const LinearProgressIndicator(color: kBeige),
                  error: (_, __) => const SizedBox(),
                ),
              ),
            ],
          ),
        ),
        // Right panel — placeholder
        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.chat_bubble_outline, size: 48, color: kTextMuted),
                const SizedBox(height: 12),
                const Text('Select a patient to view chat',
                    style: TextStyle(color: kTextSecondary)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SideNavItem {
  final IconData icon;
  final String label;
  const _SideNavItem({required this.icon, required this.label});
}
