import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/optimized_network_image.dart';
import '../../../shared/widgets/user_avatar.dart';

class FanMediaSheet extends StatelessWidget {
  final Map<String, dynamic> media;
  const FanMediaSheet({super.key, required this.media});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      expand: false,
      builder: (context, scrollController) {
        return SingleChildScrollView(
          controller: scrollController,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                  decoration: BoxDecoration(
                    color:
                        isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    borderRadius: AppRadius.rFull,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Row(
                  children: [
                    const UserAvatar(
                      radius: 16,
                      imageUrl:
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
                    ),
                    AppSpacing.gapSM,
                    Text(
                      'Unlocked Content',
                      style: TextStyle(
                        color: isDark
                            ? AppColors.darkTextMain
                            : AppColors.lightTextMain,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      media['date'] as String? ?? '',
                      style: TextStyle(
                        color: isDark
                            ? AppColors.darkTextMuted
                            : AppColors.lightTextMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: AspectRatio(
                  aspectRatio: 1.1,
                  child: ClipRRect(
                    borderRadius: AppRadius.rMD,
                    child: OptimizedNetworkImage(
                      imageUrl: media['image'] as String? ?? '',
                      fit: BoxFit.cover,
                      cacheExtentMultiplier: 1.25,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: RichText(
                  text: TextSpan(
                    style: TextStyle(
                      color: isDark
                          ? AppColors.darkTextMain
                          : AppColors.lightTextMain,
                      fontSize: 12.5,
                      fontFamily: 'Inter',
                      height: 1.4,
                    ),
                    children: [
                      TextSpan(
                        text: '@${media['creator'] ?? ''} ',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.lightPrimary),
                      ),
                      TextSpan(text: media['caption'] as String? ?? ''),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
