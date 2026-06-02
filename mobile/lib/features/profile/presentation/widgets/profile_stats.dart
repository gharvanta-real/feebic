import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

class ProfileStats extends StatelessWidget {
  final String postsCount;
  final String followersCount;
  final String subscribersCount;

  const ProfileStats({
    super.key,
    required this.postsCount,
    required this.followersCount,
    required this.subscribersCount,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final textColor = isDark ? AppColors.darkTextMain : AppColors.lightTextMain;
    final mutedColor =
        isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;
    final dividerColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildItem(postsCount, 'Posts', textColor, mutedColor),
        _buildDivider(dividerColor),
        _buildItem(followersCount, 'Followers', textColor, mutedColor),
        _buildDivider(dividerColor),
        _buildItem(subscribersCount, 'Subscribers', textColor, mutedColor),
      ],
    );
  }

  Widget _buildItem(
      String count, String label, Color countColor, Color labelColor) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          count,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 15,
            color: countColor,
            letterSpacing: -0.5,
          ),
        ),
        AppSpacing.gapXXS,
        Text(
          label,
          style: TextStyle(
            color: labelColor,
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider(Color color) {
    return Container(
      height: 24,
      width: 1,
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      color: color,
    );
  }
}
