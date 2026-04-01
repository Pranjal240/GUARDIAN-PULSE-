import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../core/constants.dart';
import '../../providers/sensor_providers.dart';
import '../../widgets/bpm_display_widget.dart';
import '../../widgets/ecg_chart_widget.dart';
import '../../widgets/vitals_card_widget.dart';
import '../../widgets/logo_widget.dart';
import 'ecg_detail_screen.dart';
import 'chat_screen.dart';
import 'settings_screen.dart';

class PatientHomeScreen extends ConsumerStatefulWidget {
  final String userId;
  const PatientHomeScreen({super.key, required this.userId});

  @override
  ConsumerState<PatientHomeScreen> createState() => _PatientHomeScreenState();
}

class _PatientHomeScreenState extends ConsumerState<PatientHomeScreen> {
  int _currentTab = 0;

  late final List<Widget> _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = [
      _HomeTab(userId: widget.userId),
      EcgDetailScreen(userId: widget.userId),
      ChatScreen(userId: widget.userId),
      SettingsScreen(userId: widget.userId),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgApp,
      body: IndexedStack(index: _currentTab, children: _tabs),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    const items = [
      _NavItem(icon: Icons.home_rounded, label: 'Home'),
      _NavItem(icon: Icons.monitor_heart_rounded, label: 'ECG'),
      _NavItem(icon: Icons.chat_bubble_rounded, label: 'Chat'),
      _NavItem(icon: Icons.settings_rounded, label: 'Settings'),
    ];

    return Container(
      decoration: BoxDecoration(
        color: kBgNav,
        border: Border(top: BorderSide(color: kBeige.withOpacity(0.08), width: 1)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: items.asMap().entries.map((e) {
              final isActive = e.key == _currentTab;
              return GestureDetector(
                onTap: () => setState(() => _currentTab = e.key),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        e.value.icon,
                        size: 22,
                        color: isActive ? kBeige : kTextMuted,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        e.value.label,
                        style: TextStyle(
                          fontSize: 10,
                          color: isActive ? kBeige : kTextMuted,
                          fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                      const SizedBox(height: 2),
                      // Active dot
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: isActive ? 4 : 0,
                        height: isActive ? 4 : 0,
                        decoration: const BoxDecoration(
                          color: kBeige,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

// ─── Home Tab ────────────────────────────────────────
class _HomeTab extends ConsumerWidget {
  final String userId;
  const _HomeTab({required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bpm = ref.watch(latestBpmProvider(userId));
    final ecgAsync = ref.watch(ecgReadingsProvider(userId));
    final alertsAsync = ref.watch(activeAlertsProvider(userId));
    final isPiOn = ref.watch(isPiConnectedProvider(userId));
    final stress = ref.watch(stressLevelProvider(userId));
    final tremor = ref.watch(tremorDetectedProvider(userId));

    return SafeArea(
      child: RefreshIndicator(
        color: kBeige,
        backgroundColor: kBgCard,
        onRefresh: () async {},
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── App Bar ──────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(kPad, 12, kPad, 0),
                child: Row(
                  children: [
                    const GuardianPulseLogo(height: 32, showText: true),
                    const Spacer(),
                    // Notification bell
                    alertsAsync.when(
                      data: (alerts) => alerts.isNotEmpty
                          ? Stack(
                              children: [
                                const Icon(Icons.notifications_outlined, color: kBeige),
                                Positioned(
                                  right: 0,
                                  top: 0,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: kAlertRed,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : const Icon(Icons.notifications_outlined, color: kTextSecondary),
                      loading: () => const SizedBox.shrink(),
                      error: (_, __) => const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ── Live Status Card ─────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: kPad),
                child: _LiveStatusCard(
                  bpm: bpm,
                  isPiConnected: isPiOn,
                ).animate().fade(duration: 400.ms),
              ),

              const SizedBox(height: 20),

              // ── Video Carousel ───────────────────────
              _VideoCarouselSection(),

              const SizedBox(height: 20),

              // ── Live ECG Card ────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: kPad),
                child: GestureDetector(
                  onTap: () {
                    final state = context
                        .findAncestorStateOfType<_PatientHomeScreenState>();
                    state?.setState(() => state._currentTab = 1);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: kBgCard,
                      borderRadius: BorderRadius.circular(kCardRadius),
                      border: Border(
                        left: const BorderSide(color: kBeige, width: 4),
                        top: BorderSide(color: kBeige.withOpacity(0.12)),
                        bottom: BorderSide(color: kBeige.withOpacity(0.12)),
                        right: BorderSide(color: kBeige.withOpacity(0.12)),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text('Live ECG',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: kTextPrimary)),
                            const SizedBox(width: 8),
                            _PulsingDot(color: kSuccessGreen),
                            const Spacer(),
                            const Text(
                              'Full analysis →',
                              style: TextStyle(fontSize: 12, color: kBeige),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ecgAsync.when(
                          data: (readings) => EcgChartWidget(
                            data: readings.map((r) {
                              return ((r['rawValue'] as num?) ?? 0).toDouble();
                            }).toList(),
                            height: 100,
                          ),
                          loading: () => const SkeletonLoaderWidget(height: 100),
                          error: (_, __) => const SizedBox(height: 100),
                        ),
                      ],
                    ),
                  ),
                ).animate(delay: 200.ms).fade().slideY(begin: 0.05),
              ),

              const SizedBox(height: 20),

              // ── Vitals Grid ──────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: kPad),
                child: GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: kCardGap,
                  mainAxisSpacing: kCardGap,
                  childAspectRatio: 1.3,
                  children: [
                    // BPM
                    VitalsCardWidget(
                      label: 'HEART RATE',
                      child: BpmDisplayWidget(bpm: bpm, fontSize: 28),
                    ),
                    // Stress
                    VitalsCardWidget(
                      label: 'STRESS',
                      accentColor: _stressColor(stress),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${stress.toStringAsFixed(0)}',
                            style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: _stressColor(stress),
                            ),
                          ),
                          Text('/100', style: TextStyle(fontSize: 11, color: kTextMuted)),
                        ],
                      ),
                    ),
                    // Tremor
                    VitalsCardWidget(
                      label: 'TREMOR',
                      accentColor: tremor ? kAlertRed : kSuccessGreen,
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: tremor ? kAlertRed : kSuccessGreen,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: (tremor ? kAlertRed : kSuccessGreen)
                                      .withOpacity(0.4),
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            tremor ? 'Detected' : 'Normal',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: tremor ? kAlertRed : kSuccessGreen,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Pi Status
                    VitalsCardWidget(
                      label: 'DEVICE',
                      accentColor: isPiOn ? kSuccessGreen : kTextMuted,
                      child: Row(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: isPiOn ? kSuccessGreen : kTextMuted,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            isPiOn ? 'Connected' : 'Offline',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: isPiOn ? kSuccessGreen : kTextMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ).animate(delay: 300.ms).fade(),
              ),

              const SizedBox(height: 20),

              // ── Recent Alerts ────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: kPad),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Recent Alerts',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: kTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    alertsAsync.when(
                      data: (alerts) => alerts.isEmpty
                          ? _allClearCard()
                          : Column(
                              children: alerts.take(3).map(_alertCard).toList(),
                            ),
                      loading: () => const SkeletonLoaderWidget(height: 60),
                      error: (_, __) => _allClearCard(),
                    ),
                  ],
                ).animate(delay: 400.ms).fade(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _stressColor(double v) {
    if (v < 33) return kSuccessGreen;
    if (v < 66) return kWarningAmber;
    return kAlertRed;
  }

  Widget _allClearCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kBgCard,
        borderRadius: BorderRadius.circular(kCardRadius),
        border: Border.all(color: kSuccessGreen.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: kSuccessGreen),
          const SizedBox(width: 12),
          const Text('All clear — no active alerts',
              style: TextStyle(color: kSuccessGreen, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _alertCard(Map<String, dynamic> alert) {
    final type = alert['alertType'] as String? ?? 'Alert';
    final ts = alert['createdAt'] as int? ?? 0;
    final time = ts > 0
        ? DateFormat.jm().format(DateTime.fromMillisecondsSinceEpoch(ts))
        : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kBgCard,
        borderRadius: BorderRadius.circular(kCardRadius),
        border: Border(left: const BorderSide(color: kAlertRed, width: 3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: kAlertRed, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(type,
                style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w500)),
          ),
          Text(time, style: const TextStyle(fontSize: 12, color: kTextMuted)),
        ],
      ),
    );
  }
}

// ─── Live Status Card ────────────────────────────────
class _LiveStatusCard extends StatelessWidget {
  final int bpm;
  final bool isPiConnected;

  const _LiveStatusCard({required this.bpm, required this.isPiConnected});

  @override
  Widget build(BuildContext context) {
    final status = _statusText(bpm);
    final statusColor = _statusColor(bpm);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kBgCard,
        borderRadius: BorderRadius.circular(kCardRadius),
        border: Border.all(color: kBeige.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Status
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: statusColor.withOpacity(0.5), blurRadius: 6)],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            status,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: statusColor,
              fontSize: 13,
            ),
          ),
          const Spacer(),
          // LIVE pill
          if (isPiConnected)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: kBeige.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: kBeige.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _PulsingDot(color: kBeige),
                  const SizedBox(width: 5),
                  const Text('LIVE',
                      style: TextStyle(fontSize: 10, color: kBeige, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          const SizedBox(width: 12),
          BpmDisplayWidget(bpm: bpm, fontSize: 26, showLabel: true),
        ],
      ),
    );
  }

  String _statusText(int bpm) {
    if (bpm == 0) return 'No Signal';
    if (bpm < 50 || bpm > 130) return 'Critical';
    if (bpm < 60 || bpm > 100) return 'Caution';
    return 'Normal';
  }

  Color _statusColor(int bpm) {
    if (bpm == 0) return kTextMuted;
    if (bpm < 50 || bpm > 130) return kAlertRed;
    if (bpm < 60 || bpm > 100) return kWarningAmber;
    return kSuccessGreen;
  }
}

// ─── Video Carousel ─────────────────────────────────
class _VideoCarouselSection extends StatefulWidget {
  @override
  State<_VideoCarouselSection> createState() => _VideoCarouselSectionState();
}

class _VideoCarouselSectionState extends State<_VideoCarouselSection> {
  int _currentPage = 0;
  final _pageController = PageController(viewportFraction: 0.88);

  static const _videos = [
    _VideoItem(title: 'Understanding Your ECG', color: Color(0xFF1A3A2A)),
    _VideoItem(title: 'Managing Cardiac Stress', color: Color(0xFF1E2B3A)),
    _VideoItem(title: 'Tremor Awareness', color: Color(0xFF2A1A1A)),
    _VideoItem(title: 'PTSD & Heart Rate', color: Color(0xFF2A1A3A)),
    _VideoItem(title: 'Sleep & Heart Health', color: Color(0xFF1A2A2A)),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: kPad),
          child: const Text(
            'Health Resources',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: kTextPrimary,
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 180,
          child: PageView.builder(
            controller: _pageController,
            itemCount: _videos.length,
            onPageChanged: (i) => setState(() => _currentPage = i),
            itemBuilder: (_, i) {
              return AnimatedScale(
                duration: const Duration(milliseconds: 300),
                scale: i == _currentPage ? 1.0 : 0.96,
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color: _videos[i].color,
                    borderRadius: BorderRadius.circular(kCardRadius),
                    border: Border.all(color: kBeige.withOpacity(0.12)),
                  ),
                  child: Stack(
                    children: [
                      // Play icon
                      const Center(
                        child: Icon(Icons.play_circle_outline,
                            size: 48, color: kTextSecondary),
                      ),
                      // Title at bottom
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Divider(color: kBeige, thickness: 0.5),
                            Text(
                              _videos[i].title,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: kTextPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Logo top-left
                      const Positioned(
                        top: 12,
                        left: 12,
                        child: GuardianPulseLogo(height: 20),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        // Dots
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: _videos.asMap().entries.map((e) {
            return AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: e.key == _currentPage ? 16 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: e.key == _currentPage ? kBeige : kOliveMuted,
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _VideoItem {
  final String title;
  final Color color;
  const _VideoItem({required this.title, required this.color});
}

// ─── Pulsing Dot ────────────────────────────────────
class _PulsingDot extends StatelessWidget {
  final Color color;
  const _PulsingDot({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: color.withOpacity(0.5), blurRadius: 4)],
      ),
    )
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .scale(
          begin: const Offset(0.8, 0.8),
          end: const Offset(1.2, 1.2),
          duration: const Duration(milliseconds: 800),
        );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  const _NavItem({required this.icon, required this.label});
}
