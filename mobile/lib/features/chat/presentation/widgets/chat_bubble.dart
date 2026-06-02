import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import 'package:feebic_mobile/features/shared/widgets/locked_content_card.dart';

class ChatBubble extends StatelessWidget {
  final String text;
  final String time;
  final bool isMe;
  final bool isPpv;
  final String? ppvImageUrl;
  final String? ppvPrice;
  final VoidCallback? onPpvUnlockPressed;

  const ChatBubble({
    super.key,
    required this.text,
    required this.time,
    required this.isMe,
    this.isPpv = false,
    this.ppvImageUrl,
    this.ppvPrice,
    this.onPpvUnlockPressed,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bubbleColor = isMe
        ? AppColors.lightPrimary
        : (isDark
            ? AppColors.darkBorder
            : AppColors.lightBorder.withOpacity(0.35));

    final textColor = isMe
        ? Colors.white
        : (isDark ? AppColors.darkTextMain : AppColors.lightTextMain);

    Widget body = Text(
      text,
      style: TextStyle(
        color: textColor,
        fontSize: 13,
        height: 1.35,
      ),
    );

    // If it's a PPV Locked Message, overlay the LockedContentCard
    if (isPpv && ppvImageUrl != null) {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: AppRadius.rSM,
            child: SizedBox(
              height: 180,
              width: 220,
              child: LockedContentCard(
                placeholderImageUrl: ppvImageUrl!,
                priceLabel: ppvPrice ?? 'Rs 399',
                onUnlockPressed: onPpvUnlockPressed ?? () {},
              ),
            ),
          ),
          AppSpacing.gapSM,
          Text(
            text,
            style: TextStyle(
              color: textColor,
              fontSize: 12.5,
              height: 1.3,
            ),
          ),
        ],
      );
    }

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        padding: AppSpacing.pAllSM,
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppRadius.md),
            topRight: const Radius.circular(AppRadius.md),
            bottomLeft: Radius.circular(isMe ? AppRadius.md : AppRadius.xs),
            bottomRight: Radius.circular(isMe ? AppRadius.xs : AppRadius.md),
          ),
          boxShadow: isMe
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  )
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: [
            body,
            AppSpacing.gapXXS,
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  time,
                  style: TextStyle(
                    color: isMe
                        ? Colors.white70
                        : (isDark
                            ? AppColors.darkTextMuted
                            : AppColors.lightTextMuted),
                    fontSize: 8.5,
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.done_all_rounded,
                    color: Colors.white70,
                    size: 11,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
