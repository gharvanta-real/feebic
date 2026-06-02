import 'package:flutter/material.dart';

class AppRadius {
  AppRadius._();

  // Corner radius values in pixels
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 24.0;
  static const double full = 9999.0;

  // BorderRadius shapes
  static const BorderRadius rXS = BorderRadius.all(Radius.circular(xs));
  static const BorderRadius rSM = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius rMD = BorderRadius.all(Radius.circular(md));
  static const BorderRadius rLG = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius rXL = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius rFull = BorderRadius.all(Radius.circular(full));

  // Top rounded corners (useful for bottom sheets)
  static const BorderRadius topMD =
      BorderRadius.vertical(top: Radius.circular(md));
  static const BorderRadius topLG =
      BorderRadius.vertical(top: Radius.circular(lg));
}
