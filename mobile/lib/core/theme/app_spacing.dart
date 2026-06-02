import 'package:flutter/material.dart';

class AppSpacing {
  AppSpacing._();

  // Spacing values in pixels
  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;

  // Convenient EdgeInsects constants to prevent hardcoded paddings/margins
  static const EdgeInsets pAllXS = EdgeInsets.all(xs);
  static const EdgeInsets pAllSM = EdgeInsets.all(sm);
  static const EdgeInsets pAllMD = EdgeInsets.all(md);
  static const EdgeInsets pAllLG = EdgeInsets.all(lg);

  static const EdgeInsets pHorizontalXS = EdgeInsets.symmetric(horizontal: xs);
  static const EdgeInsets pHorizontalSM = EdgeInsets.symmetric(horizontal: sm);
  static const EdgeInsets pHorizontalMD = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets pHorizontalLG = EdgeInsets.symmetric(horizontal: lg);

  static const EdgeInsets pVerticalXS = EdgeInsets.symmetric(vertical: xs);
  static const EdgeInsets pVerticalSM = EdgeInsets.symmetric(vertical: sm);
  static const EdgeInsets pVerticalMD = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets pVerticalLG = EdgeInsets.symmetric(vertical: lg);

  // Convenient Spacer gaps for columns and rows
  static const SizedBox gapXXS = SizedBox(width: xxs, height: xxs);
  static const SizedBox gapXS = SizedBox(width: xs, height: xs);
  static const SizedBox gapSM = SizedBox(width: sm, height: sm);
  static const SizedBox gapMD = SizedBox(width: md, height: md);
  static const SizedBox gapLG = SizedBox(width: lg, height: lg);
  static const SizedBox gapXL = SizedBox(width: xl, height: xl);
}
