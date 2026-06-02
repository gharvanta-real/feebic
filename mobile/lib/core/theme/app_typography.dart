import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';

  // --- Light Theme Typography ---
  static const TextStyle lightHeading1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: AppColors.lightTextMain,
    height: 1.25,
  );

  static const TextStyle lightHeading2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppColors.lightTextMain,
    height: 1.3,
  );

  static const TextStyle lightSubheading = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.lightTextMain,
    height: 1.4,
  );

  static const TextStyle lightBodyMain = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AppColors.lightTextMain,
    height: 1.5,
  );

  static const TextStyle lightBodyMuted = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AppColors.lightTextMuted,
    height: 1.5,
  );

  static const TextStyle lightCaption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.lightTextMuted,
    height: 1.4,
  );

  // --- Dark Theme Typography ---
  static const TextStyle darkHeading1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: AppColors.darkTextMain,
    height: 1.25,
  );

  static const TextStyle darkHeading2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: AppColors.darkTextMain,
    height: 1.3,
  );

  static const TextStyle darkSubheading = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.darkTextMain,
    height: 1.4,
  );

  static const TextStyle darkBodyMain = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AppColors.darkTextMain,
    height: 1.5,
  );

  static const TextStyle darkBodyMuted = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AppColors.darkTextMuted,
    height: 1.5,
  );

  static const TextStyle darkCaption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.darkTextMuted,
    height: 1.4,
  );
}
