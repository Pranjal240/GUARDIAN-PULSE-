import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../core/theme.dart';

/// Animated BPM display with color-coding and optional pulse glow
class BpmDisplayWidget extends StatelessWidget {
  final int bpm;
  final double fontSize;
  final bool showGlow;
  final bool showLabel;

  const BpmDisplayWidget({
    super.key,
    required this.bpm,
    this.fontSize = 32,
    this.showGlow = true,
    this.showLabel = true,
  });

  Color get _bpmColor {
    if (bpm == 0) return kTextMuted;
    if (bpm < 50 || bpm > 130) return kAlertRed;
    if (bpm < 60 || bpm > 100) return kWarningAmber;
    return kSuccessGreen;
  }

  bool get _isCritical => bpm != 0 && (bpm < 50 || bpm > 130);

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        TweenAnimationBuilder<int>(
          tween: IntTween(begin: bpm, end: bpm),
          duration: const Duration(milliseconds: 400),
          builder: (_, value, __) {
            return Container(
              decoration: _isCritical && showGlow
                  ? BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: kAlertRed.withOpacity(0.4),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    )
                  : null,
              child: Text(
                bpm == 0 ? '--' : '$value',
                style: AppTheme.monoNumber(
                  size: fontSize,
                  color: _bpmColor,
                ),
              ),
            );
          },
        ),
        if (showLabel) ...[
          const SizedBox(height: 2),
          Text(
            'BPM',
            style: TextStyle(
              fontSize: 11,
              color: kTextMuted,
              fontWeight: FontWeight.w500,
              letterSpacing: 1.5,
            ),
          ),
        ],
      ],
    );
  }
}
