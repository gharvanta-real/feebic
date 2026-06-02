import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import '../widgets/saved_post_detail_sheet.dart';
import '../../../shared/widgets/optimized_network_image.dart';

class SavedCollectionsScreen extends StatefulWidget {
  const SavedCollectionsScreen({super.key});

  @override
  State<SavedCollectionsScreen> createState() => _SavedCollectionsScreenState();
}

class _SavedCollectionsScreenState extends State<SavedCollectionsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved collections',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: AnimatedBuilder(
        animation: DemoAppState.instance,
        builder: (context, _) {
          final savedIds = DemoAppState.instance.savedPostIds;
          final allPosts = DemoAppState.instance.posts;
          final savedPosts =
              allPosts.where((post) => savedIds.contains(post.postId)).toList();

          if (savedPosts.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.bookmark_border_rounded,
                      size: 40, color: Colors.grey.withOpacity(0.5)),
                  AppSpacing.gapSM,
                  const Text('No saved posts yet',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 4),
                  const Text('Tap bookmark icon on posts to save.',
                      style: TextStyle(color: Colors.grey, fontSize: 11)),
                ],
              ),
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(AppSpacing.md),
            addAutomaticKeepAlives: false,
            addRepaintBoundaries: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 6,
              mainAxisSpacing: 6,
            ),
            itemCount: savedPosts.length,
            itemBuilder: (context, index) {
              final post = savedPosts[index];
              return GestureDetector(
                onTap: () => _showSavedPostDetailSheet(context, post),
                child: ClipRRect(
                  borderRadius: AppRadius.rSM,
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
                          top: 4,
                          left: 4,
                          child: Icon(Icons.play_circle_fill,
                              color: Colors.white, size: 16),
                        ),
                      const Positioned(
                        bottom: 4,
                        right: 4,
                        child: Icon(Icons.bookmark_rounded,
                            color: Colors.white, size: 14),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showSavedPostDetailSheet(BuildContext context, DemoPost post) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (context) => SavedPostDetailSheet(post: post),
    );
  }
}
