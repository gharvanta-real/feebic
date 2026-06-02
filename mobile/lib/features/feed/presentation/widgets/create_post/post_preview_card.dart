import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_radius.dart';
import '../../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/optimized_network_image.dart';
import '../../../../shared/widgets/user_avatar.dart';
import '../../../../shared/widgets/video_player_card.dart';

class PostPreviewCard extends StatelessWidget {
  const PostPreviewCard({
    super.key,
    required this.caption,
    required this.mediaUrl,
    required this.videoUrl,
    required this.isVideo,
    required this.locked,
    required this.price,
    required this.blur,
    required this.watermarkEnabled,
    required this.watermarkText,
    required this.pollEnabled,
    required this.pollOptions,
  });

  final String caption;
  final String mediaUrl;
  final String? videoUrl;
  final bool isVideo;
  final bool locked;
  final double price;
  final double blur;
  final bool watermarkEnabled;
  final String watermarkText;
  final bool pollEnabled;
  final List<String> pollOptions;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: AppRadius.rSM,
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(AppSpacing.sm),
            child: Row(
              children: [
                UserAvatar(
                  radius: 14,
                  imageUrl:
                      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
                ),
                AppSpacing.gapXS,
                Text(
                  'alexandra_arts',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                AppSpacing.gapXXS,
                Icon(Icons.verified, color: AppColors.lightPrimary, size: 14),
                Spacer(),
                Icon(Icons.more_horiz, size: 20),
              ],
            ),
          ),
          AspectRatio(
            aspectRatio: isVideo ? 16 / 9 : 1.08,
            child: locked
                ? _LockedPreview(
                    imageUrl: mediaUrl,
                    blur: blur,
                    price: price,
                    watermarkEnabled: watermarkEnabled,
                    watermarkText: watermarkText,
                  )
                : isVideo
                    ? VideoPlayerCard(
                        placeholderImageUrl: mediaUrl,
                        videoUrl: videoUrl ?? mediaUrl,
                        priceLabel: 'Rs ${price.round()}',
                        isLocked: false,
                        onUnlockPressed: () {},
                      )
                    : OptimizedNetworkImage(
                        imageUrl: mediaUrl, fit: BoxFit.cover),
          ),
          if (pollEnabled && pollOptions.isNotEmpty)
            _PollPreview(options: pollOptions),
          const _PreviewActions(),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              0,
              AppSpacing.md,
              AppSpacing.md,
            ),
            child: RichText(
              text: TextSpan(
                style: TextStyle(
                  color:
                      isDark ? AppColors.darkTextMain : AppColors.lightTextMain,
                  fontSize: 12,
                  height: 1.35,
                ),
                children: [
                  const TextSpan(
                    text: 'alexandra_arts ',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  TextSpan(
                    text: caption.trim().isEmpty
                        ? 'New exclusive post is ready for fans.'
                        : caption.trim(),
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

class _LockedPreview extends StatelessWidget {
  const _LockedPreview({
    required this.imageUrl,
    required this.blur,
    required this.price,
    required this.watermarkEnabled,
    required this.watermarkText,
  });

  final String imageUrl;
  final double blur;
  final double price;
  final bool watermarkEnabled;
  final String watermarkText;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        ImageFiltered(
          imageFilter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: OptimizedNetworkImage(
            imageUrl: imageUrl,
            fit: BoxFit.cover,
            cacheExtentMultiplier: 0.8,
          ),
        ),
        ColoredBox(color: Colors.black.withOpacity(0.44)),
        if (watermarkEnabled)
          Positioned(
            top: AppSpacing.sm,
            left: AppSpacing.sm,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.45),
                borderRadius: AppRadius.rXS,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: AppSpacing.xxs,
                ),
                child: Text(
                  watermarkText.trim().isEmpty
                      ? '@alexandra_arts'
                      : watermarkText,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_rounded, color: Colors.white, size: 30),
              AppSpacing.gapXS,
              const Text(
                'Exclusive Media',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              Text(
                'Unlock for Rs ${price.round()}',
                style: const TextStyle(color: Colors.white70, fontSize: 11),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PreviewActions extends StatelessWidget {
  const _PreviewActions();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      child: Row(
        children: [
          Icon(Icons.favorite_border_rounded, size: 21),
          SizedBox(width: 5),
          Text('0',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          SizedBox(width: AppSpacing.sm),
          Icon(Icons.chat_bubble_outline_rounded, size: 21),
          SizedBox(width: 5),
          Text('0',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          SizedBox(width: AppSpacing.sm),
          Icon(Icons.ios_share_rounded, size: 21),
          Spacer(),
          Icon(Icons.bookmark_border_rounded, size: 22),
        ],
      ),
    );
  }
}

class _PollPreview extends StatelessWidget {
  const _PollPreview({required this.options});

  final List<String> options;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).primaryColor;
    final safeOptions =
        options.where((option) => option.trim().isNotEmpty).toList();

    return Padding(
      padding: AppSpacing.pAllSM,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.poll_rounded, color: primary, size: 21),
              AppSpacing.gapXS,
              const Text('Fan poll',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            ],
          ),
          AppSpacing.gapXS,
          ...safeOptions.take(5).map(
                (option) => Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    border: Border.all(color: primary.withOpacity(0.22)),
                    borderRadius: AppRadius.rXS,
                  ),
                  child: Text(option, style: const TextStyle(fontSize: 11)),
                ),
              ),
        ],
      ),
    );
  }
}
