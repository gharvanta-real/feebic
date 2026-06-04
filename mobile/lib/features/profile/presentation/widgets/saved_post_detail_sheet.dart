import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../feed/presentation/widgets/feed_card.dart';

class SavedPostDetailSheet extends StatelessWidget {
  final DemoPost post;
  const SavedPostDetailSheet({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      expand: false,
      builder: (context, scrollController) => SingleChildScrollView(
        controller: scrollController,
        child: Column(
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  borderRadius: AppRadius.rFull,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Text(
                'saved post details',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color:
                      isDark ? AppColors.darkTextMain : AppColors.lightTextMain,
                ),
              ),
            ),
            const Divider(height: 1),
            FeedCard(
              postId: post.postId,
              username: post.username,
              avatarUrl: post.avatarUrl,
              isVerified: post.isVerified,
              caption: post.caption,
              imageUrl: post.imageUrl,
              videoUrl: post.videoUrl,
              isLocked: post.isLocked,
              unlockPrice: post.unlockPrice,
              isVideo: post.isVideo,
              likes: post.likes,
              comments: post.comments,
              isLiked: false,
              isBookmarked: true,
              onLikePressed: () {
                post.likes = post.likes + 1;
              },
              onCommentPressed: () {},
              onUnlockPressed: () {
                final price = double.tryParse((post.unlockPrice ?? 'Rs 399')
                        .replaceAll('Rs ', '')
                        .replaceAll(',', '')) ??
                    399.0;
                DemoAppState.instance.unlockPost(
                  id: post.postId,
                  price: price,
                  image: post.imageUrl ?? '',
                  creator: post.username,
                  caption: post.caption,
                );
              },
              creatorId: '',
              category: 'Lifestyle',
            ),
          ],
        ),
      ),
    );
  }
}
