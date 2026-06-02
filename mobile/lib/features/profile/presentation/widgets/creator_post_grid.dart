import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/optimized_network_image.dart';

class CreatorPostGrid extends StatelessWidget {
  final List<Map<String, dynamic>> posts;
  final bool isLockedTab;
  final Function(Map<String, dynamic>) onTap;

  const CreatorPostGrid({
    super.key,
    required this.posts,
    required this.isLockedTab,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GridView.builder(
      padding: const EdgeInsets.all(AppSpacing.xxs),
      addAutomaticKeepAlives: false,
      addRepaintBoundaries: true,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 3,
        mainAxisSpacing: 3,
      ),
      itemCount: posts.length,
      itemBuilder: (context, index) {
        final post = posts[index];
        final isLocked = post['isLocked'] == true;

        return GestureDetector(
          onTap: () => onTap(post),
          child: ClipRRect(
            borderRadius: AppRadius.rXS,
            child: Stack(
              children: [
                Positioned.fill(
                  child: OptimizedNetworkImage(
                    imageUrl: post['image'] as String? ?? '',
                    fit: BoxFit.cover,
                    cacheExtentMultiplier: 0.8,
                  ),
                ),
                if (isLocked)
                  Positioned.fill(
                    child: Container(
                      color: (isDark
                              ? AppColors.darkAccent
                              : AppColors.lightAccent)
                          .withOpacity(0.4),
                      child: const Center(
                        child: Icon(Icons.lock_rounded,
                            color: Colors.white, size: 20),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
