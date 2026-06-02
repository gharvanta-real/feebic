import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';

class SubscriptionTierCard extends StatelessWidget {
  final String priceLabel;
  final String title;
  final String description;
  final VoidCallback onSubscribePressed;
  final bool isSubscribed;

  const SubscriptionTierCard({
    super.key,
    required this.priceLabel,
    required this.title,
    required this.description,
    required this.onSubscribePressed,
    this.isSubscribed = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cardBg = isDark
        ? AppColors.darkBorder.withOpacity(0.15)
        : AppColors.lightBorder.withOpacity(0.15);

    final borderColor = isDark
        ? AppColors.darkBorder.withOpacity(0.5)
        : AppColors.lightBorder.withOpacity(0.5);

    final textMainColor =
        isDark ? AppColors.darkTextMain : AppColors.lightTextMain;

    final textMutedColor =
        isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;

    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Container(
      padding: AppSpacing.pAllMD,
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: AppRadius.rMD,
        border: Border.all(
          color: borderColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: textMainColor,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                priceLabel,
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  color: primaryColor,
                ),
              ),
            ],
          ),
          AppSpacing.gapXS,
          Text(
            description,
            style: TextStyle(
              color: textMutedColor,
              fontSize: 12,
              height: 1.4,
            ),
          ),
          AppSpacing.gapMD,
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onSubscribePressed,
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    isSubscribed ? Colors.transparent : primaryColor,
                foregroundColor: isSubscribed ? textMutedColor : Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                shape: RoundedRectangleBorder(
                  borderRadius: AppRadius.rSM,
                  side: isSubscribed
                      ? BorderSide(color: borderColor, width: 1.0)
                      : BorderSide.none,
                ),
              ),
              child: Text(
                isSubscribed ? 'Subscribed' : 'Subscribe Now',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
