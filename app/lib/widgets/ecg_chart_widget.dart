import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../core/constants.dart';

/// Reusable ECG chart using fl_chart
class EcgChartWidget extends StatelessWidget {
  final List<double> data;
  final double height;
  final bool showAxes;
  final Color lineColor;
  final bool showArea;
  final List<int> anomalyIndices;

  const EcgChartWidget({
    super.key,
    required this.data,
    this.height = 100,
    this.showAxes = false,
    this.lineColor = kBeige,
    this.showArea = true,
    this.anomalyIndices = const [],
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return SizedBox(
        height: height,
        child: Center(
          child: Text(
            'Waiting for data...',
            style: TextStyle(color: kTextMuted, fontSize: 13),
          ),
        ),
      );
    }

    final spots = data.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value);
    }).toList();

    return RepaintBoundary(
      child: SizedBox(
        height: height,
        child: LineChart(
          LineChartData(
            backgroundColor: Colors.transparent,
            gridData: FlGridData(
              show: showAxes,
              drawVerticalLine: false,
              getDrawingHorizontalLine: (_) => FlLine(
                color: kOliveMuted.withOpacity(0.2),
                strokeWidth: 1,
              ),
            ),
            titlesData: FlTitlesData(show: showAxes),
            borderData: FlBorderData(show: false),
            lineTouchData: LineTouchData(
              enabled: showAxes,
              touchTooltipData: LineTouchTooltipData(
                tooltipBgColor: kBgCard,
                getTooltipItems: (spots) => spots.map((s) {
                  return LineTooltipItem(
                    '${s.y.toStringAsFixed(1)} mV',
                    const TextStyle(color: kBeige, fontSize: 12),
                  );
                }).toList(),
              ),
            ),
            lineBarsData: [
              LineChartBarData(
                spots: spots,
                isCurved: true,
                curveSmoothness: 0.3,
                color: lineColor,
                barWidth: 2,
                isStrokeCapRound: true,
                dotData: FlDotData(
                  show: anomalyIndices.isNotEmpty,
                  checkToShowDot: (spot, _) {
                    return anomalyIndices.contains(spot.x.toInt());
                  },
                  getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                    radius: 4,
                    color: kAlertRed,
                    strokeWidth: 2,
                    strokeColor: kAlertRed.withOpacity(0.3),
                  ),
                ),
                belowBarData: showArea
                    ? BarAreaData(
                        show: true,
                        gradient: LinearGradient(
                          colors: [
                            lineColor.withOpacity(0.12),
                            lineColor.withOpacity(0.01),
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      )
                    : BarAreaData(show: false),
              ),
            ],
          ),
          duration: const Duration(milliseconds: 200),
        ),
      ),
    );
  }
}
