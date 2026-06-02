import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import 'optimized_network_image.dart';

class LockedContentCard extends StatelessWidget {
  final String placeholderImageUrl;
  final String priceLabel;
  final VoidCallback onUnlockPressed;

  const LockedContentCard({
    super.key,
    required this.placeholderImageUrl,
    required this.priceLabel,
    required this.onUnlockPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.zero,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Blurred background image using native ImageFiltered
          Positioned.fill(
            child: ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 20.0, sigmaY: 20.0),
              child: OptimizedNetworkImage(
                imageUrl: placeholderImageUrl,
                fit: BoxFit.cover,
                cacheExtentMultiplier: 0.65,
              ),
            ),
          ),

          // Dark overlay to ensure text readability in both themes
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.45),
            ),
          ),

          // Frosted Glassmorphism Card Container
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                borderRadius: AppRadius.rMD,
                border: Border.all(
                  color: Colors.white.withOpacity(0.15),
                  width: 1.0,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Minimalistic Lock Badge
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white.withOpacity(0.2),
                        width: 1.0,
                      ),
                    ),
                    child: const Icon(
                      Icons.lock_rounded,
                      color: AppColors.white,
                      size: 26,
                    ),
                  ),
                  AppSpacing.gapSM,
                  const Text(
                    'EXCLUSIVE MEDIA',
                    style: TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                      letterSpacing: 2.0,
                    ),
                  ),
                  AppSpacing.gapXXS,
                  Text(
                    'Unlock post for $priceLabel',
                    style: TextStyle(
                      color: AppColors.white.withOpacity(0.85),
                      fontWeight: FontWeight.w500,
                      fontSize: 11,
                    ),
                  ),
                  AppSpacing.gapMD,
                  ElevatedButton(
                    onPressed: onUnlockPressed,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.white,
                      foregroundColor: AppColors.lightAccent,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                        vertical: AppSpacing.sm,
                      ),
                      shape: const RoundedRectangleBorder(
                        borderRadius: AppRadius.rFull,
                      ),
                    ),
                    child: const Text(
                      'Unlock Now',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
