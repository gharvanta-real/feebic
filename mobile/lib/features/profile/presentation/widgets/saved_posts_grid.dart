import 'package:flutter/material.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/optimized_network_image.dart';
import 'saved_post_detail_sheet.dart';

class SavedPostsGrid extends StatelessWidget {
  const SavedPostsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return AnimatedBuilder(
      animation: DemoAppState.instance,
      builder: (context, _) {
        final savedIds = DemoAppState.instance.savedPostIds;
        final allPosts = DemoAppState.instance.posts;
        final savedPosts =
            allPosts.where((post) => savedIds.contains(post.postId)).toList();

        if (savedPosts.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.bookmark_rounded,
                      size: 40,
                      color: isDark ? Colors.white24 : Colors.black26),
                  AppSpacing.gapSM,
                  Text(
                    'no saved posts yet',
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
          itemCount: savedPosts.length,
          itemBuilder: (context, index) {
            final post = savedPosts[index];
            return GestureDetector(
              onTap: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: isDark
                    ? AppColors.darkBackground
                    : AppColors.lightBackground,
                shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.zero),
                builder: (_) => SavedPostDetailSheet(post: post),
              ),
              child: AspectRatio(
                aspectRatio: 1,
                child: ClipRRect(
                  borderRadius: AppRadius.rXS,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      OptimizedNetworkImage(
                        imageUrl: post.imageUrl ?? '',
                        fit: BoxFit.cover,
                        cacheExtentMultiplier: 0.8,
                      ),
                      if (post.isVideo)
                        const Positioned(
                          top: 6,
                          left: 6,
                          child: Icon(Icons.play_circle_fill_rounded,
                              color: Colors.white, size: 16),
                        ),
                      Positioned(
                        bottom: 6,
                        right: 6,
                        child: Icon(Icons.bookmark_rounded,
                            color: primaryColor, size: 14),
                      ),
                    ],
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
