import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import 'package:felbic_mobile/features/shared/widgets/verified_badge.dart';
import 'package:felbic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:felbic_mobile/features/shared/widgets/locked_content_card.dart';
import 'package:felbic_mobile/features/shared/widgets/optimized_network_image.dart';

class CreatorPostDetailSheet extends StatefulWidget {
  final Map<String, dynamic> post;
  final VoidCallback onStateChanged;

  const CreatorPostDetailSheet({
    super.key,
    required this.post,
    required this.onStateChanged,
  });

  @override
  State<CreatorPostDetailSheet> createState() => _CreatorPostDetailSheetState();
}

class _CreatorPostDetailSheetState extends State<CreatorPostDetailSheet> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final post = widget.post;
    final isLocked = post['isLocked'] == true;
    final isLiked = post['isLiked'] == true;
    final likesCount = post['likes'] as int;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
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
                      imageUrl:
                          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
                      radius: 18,
                    ),
                    AppSpacing.gapSM,
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Lucia Fernandez',
                              style: TextStyle(
                                color: isDark
                                    ? AppColors.darkTextMain
                                    : AppColors.lightTextMain,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            const VerifiedBadge(size: 14),
                          ],
                        ),
                        Text(
                          '@lucia_fit',
                          style: TextStyle(
                            color: isDark
                                ? AppColors.darkTextMuted
                                : AppColors.lightTextMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.pop(context),
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
                    child: isLocked
                        ? LockedContentCard(
                            placeholderImageUrl:
                                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=50&auto=format&fit=crop&q=10',
                            priceLabel: post['price'] as String,
                            onUnlockPressed: () =>
                                _confirmUnlock(context, post),
                          )
                        : OptimizedNetworkImage(
                            imageUrl: post['image'] as String,
                            fit: BoxFit.cover,
                            cacheExtentMultiplier: 1.25,
                          ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                child: Row(
                  children: [
                    IconButton(
                      icon: Icon(
                        isLiked
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        size: 24,
                        color: isLiked
                            ? (isDark
                                ? AppColors.darkAccent
                                : AppColors.lightAccent)
                            : (isDark
                                ? AppColors.darkTextMain
                                : AppColors.lightTextMain),
                      ),
                      onPressed: isLocked
                          ? null
                          : () {
                              setState(() {
                                post['isLiked'] = !isLiked;
                                post['likes'] =
                                    isLiked ? likesCount - 1 : likesCount + 1;
                              });
                              widget.onStateChanged();
                            },
                    ),
                    IconButton(
                      icon: const Icon(Icons.chat_bubble_outline_rounded,
                          size: 22),
                      onPressed: isLocked ? null : () {},
                      color: isLocked
                          ? (isDark
                              ? AppColors.darkBorder
                              : AppColors.lightBorder)
                          : (isDark
                              ? AppColors.darkTextMain
                              : AppColors.lightTextMain),
                    ),
                    const Spacer(),
                    Icon(
                      Icons.lock_open_rounded,
                      size: 16,
                      color: isLocked
                          ? (isDark
                              ? AppColors.darkBorder
                              : AppColors.lightBorder)
                          : AppColors.lightSuccess,
                    ),
                    AppSpacing.gapXS,
                    Text(
                      isLocked ? 'Locked Media' : 'Unlocked Media',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isLocked
                            ? (isDark
                                ? AppColors.darkTextMuted
                                : AppColors.lightTextMuted)
                            : AppColors.lightSuccess,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md, vertical: AppSpacing.xxs),
                child: Text(
                  '$likesCount likes',
                  style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md, vertical: AppSpacing.xs),
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
                      const TextSpan(
                          text: 'lucia_fit ',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      TextSpan(text: post['caption'] as String),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        );
      },
    );
  }

  void _confirmUnlock(BuildContext context, Map<String, dynamic> post) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final priceStr = (post['price'] as String)
        .replaceAll('\$', '')
        .replaceAll('Rs', '')
        .replaceAll(',', '')
        .trim();
    final price = double.tryParse(priceStr) ?? 399.00;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        title: const Text('Confirm Post Unlock',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Text(
          'Deduct Rs ${price.toStringAsFixed(2)} from your wallet to unlock this premium content from @lucia_fit?',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel',
                style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMuted
                        : AppColors.lightTextMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              final success = DemoAppState.instance.unlockPost(
                id: post['id'] as String,
                price: price,
                image: post['image'] as String,
                creator: 'lucia_fit',
                caption: post['caption'] as String,
              );
              if (success) {
                setState(() {
                  post['isLocked'] = false;
                });
                widget.onStateChanged();
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content:
                        const Text('Post unlocked successfully. Grid updated.'),
                    backgroundColor:
                        isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text(
                        'Insufficient wallet funds. Add funds in Wallet screen.'),
                    backgroundColor:
                        isDark ? AppColors.darkAccent : AppColors.lightAccent,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: Text(
              'Unlock Now',
              style: TextStyle(
                color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
