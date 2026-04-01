import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../core/constants.dart';

/// Reusable vital metric card with shimmer loading support
class VitalsCardWidget extends StatelessWidget {
  final String label;
  final Widget child;
  final bool isLoading;
  final Color? accentColor;
  final VoidCallback? onTap;

  const VitalsCardWidget({
    super.key,
    required this.label,
    required this.child,
    this.isLoading = false,
    this.accentColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) return _buildSkeleton();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(kPad),
        decoration: BoxDecoration(
          color: kBgCard,
          borderRadius: BorderRadius.circular(kCardRadius),
          border: Border.all(color: kBeige.withOpacity(0.12)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 24,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Beige top accent bar
            Container(
              width: 32,
              height: 3,
              decoration: BoxDecoration(
                color: accentColor ?? kBeige,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: kTextMuted,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 8),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildSkeleton() {
    return Shimmer.fromColors(
      baseColor: kBgCard,
      highlightColor: kOliveMuted,
      child: Container(
        height: 100,
        decoration: BoxDecoration(
          color: kBgCard,
          borderRadius: BorderRadius.circular(kCardRadius),
        ),
      ),
    );
  }
}

/// Generic shimmer skeleton loader
class SkeletonLoaderWidget extends StatelessWidget {
  final double height;
  final double? width;
  final double radius;

  const SkeletonLoaderWidget({
    super.key,
    this.height = 80,
    this.width,
    this.radius = kCardRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: kBgCard,
      highlightColor: kOliveMuted,
      child: Container(
        height: height,
        width: width ?? double.infinity,
        decoration: BoxDecoration(
          color: kBgCard,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}
