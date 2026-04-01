import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../core/constants.dart';
import '../../providers/sensor_providers.dart';
import '../../widgets/ecg_chart_widget.dart';
import '../../widgets/bpm_display_widget.dart';
import '../../widgets/vitals_card_widget.dart';
import '../../services/api_service.dart';

class EcgDetailScreen extends ConsumerStatefulWidget {
  final String userId;
  const EcgDetailScreen({super.key, required this.userId});

  @override
  ConsumerState<EcgDetailScreen> createState() => _EcgDetailScreenState();
}

class _EcgDetailScreenState extends ConsumerState<EcgDetailScreen> {
  String _range = 'LIVE';
  bool _isAnalyzing = false;
  String? _aiAnalysis;

  static const _ranges = ['LIVE', '1H', '24H', '7D', '30D'];

  Future<void> _runAiAnalysis() async {
    setState(() => _isAnalyzing = true);
    try {
      final resultMap = await ApiService.sendChatMessage(
        widget.userId,
        'Analyze my recent ECG data and give a brief health summary.',
        history: [],
      );
      setState(() => _aiAnalysis = resultMap['response'] as String? ?? 'Analysis complete.');
    } catch (e) {
      setState(() => _aiAnalysis = 'Unable to analyze at this time. Please try again.');
    } finally {
      setState(() => _isAnalyzing = false);
    }
    _showAnalysisSheet();
  }

  void _showAnalysisSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: kBgModal,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(kPad),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: kOliveMuted,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: const [
                Text('✨ AI Analysis', style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold, color: kBeige)),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: kBgCard,
                borderRadius: BorderRadius.circular(kCardRadius),
                border: Border.all(color: kBeige.withOpacity(0.2)),
              ),
              child: Text(
                _aiAnalysis ?? 'Analyzing...',
                style: const TextStyle(color: kTextPrimary, height: 1.6),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ecgAsync = ref.watch(ecgReadingsProvider(widget.userId));
    final bpm = ref.watch(latestBpmProvider(widget.userId));
    final stress = ref.watch(stressLevelProvider(widget.userId));

    return Scaffold(
      backgroundColor: kBgApp,
      appBar: AppBar(
        title: const Text('ECG Monitor'),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(kPad),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Time Range Pills ─────────────────────
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: _ranges.map((r) {
                  final isSelected = r == _range;
                  return GestureDetector(
                    onTap: () => setState(() => _range = r),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? kBeige : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? kBeige : kOliveMuted,
                        ),
                      ),
                      child: Text(
                        r,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? kBgApp : kTextSecondary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ).animate().fade(duration: 300.ms),

            const SizedBox(height: 16),

            // ── Main Chart ───────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: kCardDecoration,
              child: ecgAsync.when(
                data: (readings) => EcgChartWidget(
                  data: readings
                      .map((r) => ((r['rawValue'] as num?) ?? 0).toDouble())
                      .toList(),
                  height: 200,
                  showAxes: true,
                ),
                loading: () => const SkeletonLoaderWidget(height: 200),
                error: (_, __) => const SkeletonLoaderWidget(height: 200),
              ),
            ).animate(delay: 100.ms).fade(),

            const SizedBox(height: 16),

            // ── Analysis Cards ───────────────────────
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: kCardGap,
              mainAxisSpacing: kCardGap,
              childAspectRatio: 1.2,
              children: [
                VitalsCardWidget(
                  label: 'CURRENT BPM',
                  child: BpmDisplayWidget(bpm: bpm, fontSize: 28),
                ),
                VitalsCardWidget(
                  label: 'STRESS LEVEL',
                  accentColor: stress > 66 ? kAlertRed : kBeige,
                  child: Text(
                    '${stress.toStringAsFixed(0)}/100',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: stress > 66 ? kAlertRed : kSuccessGreen,
                    ),
                  ),
                ),
                VitalsCardWidget(
                  label: 'HRV SCORE',
                  child: ecgAsync.when(
                    data: (r) {
                      final hrv = _calculateHrv(r);
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            hrv.toStringAsFixed(1),
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: kTextPrimary,
                            ),
                          ),
                          Text(
                            hrv > 50 ? 'Good' : hrv > 30 ? 'Fair' : 'Low',
                            style: TextStyle(fontSize: 11, color: kTextSecondary),
                          ),
                        ],
                      );
                    },
                    loading: () => const SizedBox(),
                    error: (_, __) => const SizedBox(),
                  ),
                ),
                VitalsCardWidget(
                  label: 'RANGE',
                  child: ecgAsync.when(
                    data: (r) {
                      if (r.isEmpty) return const Text('--', style: TextStyle(color: kTextMuted));
                      final bpms = r.map((e) => (e['bpm'] as num?)?.toInt() ?? 0)
                          .where((b) => b > 0).toList();
                      if (bpms.isEmpty) return const Text('--');
                      return Text(
                        '${bpms.reduce((a, b) => a < b ? a : b)}–${bpms.reduce((a, b) => a > b ? a : b)}',
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: kTextPrimary,
                        ),
                      );
                    },
                    loading: () => const SizedBox(),
                    error: (_, __) => const SizedBox(),
                  ),
                ),
              ],
            ).animate(delay: 200.ms).fade(),

            const SizedBox(height: 20),

            // ── AI Analysis Button ───────────────────
            GestureDetector(
              onTap: _isAnalyzing ? null : _runAiAnalysis,
              child: Container(
                height: 52,
                decoration: BoxDecoration(
                  color: kOlive,
                  borderRadius: BorderRadius.circular(kBtnRadius),
                ),
                child: Center(
                  child: _isAnalyzing
                      ? const CircularProgressIndicator(color: kBeige, strokeWidth: 2)
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('✨ ', style: TextStyle(fontSize: 18)),
                            Text(
                              'AI Analysis',
                              style: TextStyle(
                                color: kBeige,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                ),
              ).animate(delay: 300.ms).fade(duration: 400.ms),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  double _calculateHrv(List<Map<String, dynamic>> readings) {
    if (readings.length < 2) return 0;
    final bpms = readings
        .map((r) => (r['bpm'] as num?)?.toDouble() ?? 0)
        .where((b) => b > 0)
        .toList();
    if (bpms.length < 2) return 0;
    final rr = bpms.map((b) => 60000 / b).toList();
    final diffs = <double>[];
    for (int i = 1; i < rr.length; i++) {
      diffs.add((rr[i] - rr[i - 1]) * (rr[i] - rr[i - 1]));
    }
    final rmssd = diffs.isEmpty ? 0.0 : (diffs.reduce((a, b) => a + b) / diffs.length);
    return rmssd > 0 ? rmssd.abs() < 10000 ? rmssd.toDouble().abs() : 0 : 0;
  }
}
