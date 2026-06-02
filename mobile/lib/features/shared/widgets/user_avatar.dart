import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import 'optimized_network_image.dart';

class UserAvatar extends StatelessWidget {
  final String imageUrl;
  final double radius;
  final bool hasStory;
  final bool isOnline;

  const UserAvatar({
    super.key,
    required this.imageUrl,
    this.radius = 24.0,
    this.hasStory = false,
    this.isOnline = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    Widget avatar = SizedBox(
      width: radius * 2,
      height: radius * 2,
      child: OptimizedNetworkImage(
        imageUrl: imageUrl,
        width: radius * 2,
        height: radius * 2,
        borderRadius: BorderRadius.circular(radius),
        cacheExtentMultiplier: 1.25,
        placeholderIcon: Icons.person_rounded,
      ),
    );

    // Apply glowing story borders if hasStory is true
    if (hasStory) {
      avatar = Container(
        padding: const EdgeInsets.all(AppSpacing.xxs - 2), // 2px border gap
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: isDark
                ? [AppColors.darkPrimary, AppColors.darkAccent]
                : [AppColors.lightPrimary, AppColors.lightAccent],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.xxs - 2),
          decoration: BoxDecoration(
            color:
                isDark ? AppColors.darkBackground : AppColors.lightBackground,
            shape: BoxShape.circle,
          ),
          child: avatar,
        ),
      );
    }

    if (isOnline) {
      return Stack(
        children: [
          avatar,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: radius * 0.5,
              height: radius * 0.5,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isDark
                      ? AppColors.darkBackground
                      : AppColors.lightBackground,
                  width: 2.0,
                ),
              ),
            ),
          ),
        ],
      );
    }

    return avatar;
  }
}
