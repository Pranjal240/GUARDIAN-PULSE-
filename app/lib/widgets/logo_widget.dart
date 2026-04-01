import 'package:flutter/material.dart';
import '../core/constants.dart';

/// Reusable Guardian Pulse Logo widget
class GuardianPulseLogo extends StatelessWidget {
  final double height;
  final bool showText;
  final TextStyle? textStyle;

  const GuardianPulseLogo({
    super.key,
    this.height = 48,
    this.showText = false,
    this.textStyle,
  });

  @override
  Widget build(BuildContext context) {
    final logo = Image.asset(
      kLogoApp,
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => Icon(
        Icons.favorite,
        color: kBeige,
        size: height,
      ),
    );

    if (!showText) return logo;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        logo,
        const SizedBox(width: 10),
        Text(
          'Guardian Pulse',
          style: textStyle ??
              const TextStyle(
                fontFamily: 'Poppins',
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: kTextPrimary,
              ),
        ),
      ],
    );
  }
}
