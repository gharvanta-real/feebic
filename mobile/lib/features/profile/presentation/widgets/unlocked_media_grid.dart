import 'package:flutter/material.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/optimized_network_image.dart';
import 'fan_media_sheet.dart';

class UnlockedMediaGrid extends StatelessWidget {
  const UnlockedMediaGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return AnimatedBuilder(
      animation: DemoAppState.instance,
      builder: (context, _) {
        final mediaList = DemoAppState.instance.purchasedMedia;
        if (mediaList.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock_open_rounded,
                      size: 40,
                      color: isDark ? Colors.white24 : Colors.black26),
                  AppSpacing.gapSM,
                  Text(
                    'no unlocked media yet',
                    style: TextStyle(
                      color: isDark
                          ? AppColors.darkTextMuted
                          : AppColors.lightTextMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          addAutomaticKeepAlives: false,
          addRepaintBoundaries: true,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 3,
            mainAxisSpacing: 3,
          ),
          itemCount: mediaList.length,
          itemBuilder: (context, index) {
            final media = mediaList[index];
            return GestureDetector(
              onTap: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: isDark
                    ? AppColors.darkBackground
                    : AppColors.lightBackground,
                shape: const RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(20))),
                builder: (_) => FanMediaSheet(media: media),
              ),
              child: AspectRatio(
                aspectRatio: 1,
                child: ClipRRect(
                  borderRadius: AppRadius.rXS,
                  child: OptimizedNetworkImage(
                    imageUrl: media['image'] as String? ?? '',
                    fit: BoxFit.cover,
                    cacheExtentMultiplier: 0.8,
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
