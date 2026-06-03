import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import 'package:felbic_mobile/features/shared/widgets/locked_content_card.dart';

class ChatBubble extends StatefulWidget {
  final String text;
  final String time;
  final bool isMe;
  final bool isPpv;
  final String? mediaUrl;
  final String? mediaType;
  final String? ppvImageUrl;
  final String? ppvPrice;
  final VoidCallback? onPpvUnlockPressed;

  const ChatBubble({
    super.key,
    required this.text,
    required this.time,
    required this.isMe,
    this.isPpv = false,
    this.mediaUrl,
    this.mediaType,
    this.ppvImageUrl,
    this.ppvPrice,
    this.onPpvUnlockPressed,
  });

  @override
  State<ChatBubble> createState() => _ChatBubbleState();
}

class _ChatBubbleState extends State<ChatBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _slideAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnimation = Tween<double>(begin: 18.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bubbleColor = widget.isMe
        ? AppColors.lightPrimary
        : (isDark
            ? AppColors.darkBorder
            : AppColors.lightBorder.withOpacity(0.35));

    final textColor = widget.isMe
        ? Colors.white
        : (isDark ? AppColors.darkTextMain : AppColors.lightTextMain);

    final hasText = widget.text.trim().isNotEmpty;
    final hasMedia = (widget.mediaUrl ?? '').isNotEmpty;

    Widget? textBody;
    if (hasText) {
      textBody = Text(
        widget.text,
        style: TextStyle(
          color: textColor,
          fontSize: 13,
          height: 1.35,
        ),
      );
    }

    Widget body = textBody ?? const SizedBox.shrink();

    if (!widget.isPpv && hasMedia) {
      final isAudio = widget.mediaType == 'audio';
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isAudio)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.play_arrow_rounded,
                    color: widget.isMe ? Colors.white : AppColors.lightPrimary),
                Container(
                  height: 3,
                  width: 116,
                  decoration: BoxDecoration(
                    color: widget.isMe
                        ? Colors.white54
                        : AppColors.lightBorderStrong,
                    borderRadius: AppRadius.rFull,
                  ),
                ),
                const SizedBox(width: 8),
                Text('0:12',
                    style: TextStyle(
                      color: widget.isMe
                          ? Colors.white70
                          : AppColors.lightTextMuted,
                      fontSize: 10,
                    )),
              ],
            )
          else
            ClipRRect(
              borderRadius: AppRadius.rSM,
              child: Image.network(
                widget.mediaUrl!,
                width: 220,
                height: 180,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 220,
                  height: 140,
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  alignment: Alignment.center,
                  child: Icon(Icons.broken_image_outlined,
                      color: isDark
                          ? AppColors.darkTextMuted
                          : AppColors.lightTextMuted),
                ),
              ),
            ),
          if (textBody != null) ...[
            AppSpacing.gapSM,
            textBody,
          ],
        ],
      );
    }

    if (widget.isPpv && widget.ppvImageUrl != null) {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: AppRadius.rSM,
            child: SizedBox(
              height: 180,
              width: 220,
              child: LockedContentCard(
                placeholderImageUrl: widget.ppvImageUrl!,
                priceLabel: widget.ppvPrice ?? 'Rs 399',
                onUnlockPressed: widget.onPpvUnlockPressed ?? () {},
              ),
            ),
          ),
          AppSpacing.gapSM,
          Text(
            widget.text,
            style: TextStyle(
              color: textColor,
              fontSize: 12.5,
              height: 1.3,
            ),
          ),
        ],
      );
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _opacityAnimation.value,
          child: Transform.translate(
            offset: Offset(0, _slideAnimation.value),
            child: child,
          ),
        );
      },
      child: Align(
        alignment: widget.isMe ? Alignment.centerRight : Alignment.centerLeft,
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
              bottomLeft:
                  Radius.circular(widget.isMe ? AppRadius.md : AppRadius.xs),
              bottomRight:
                  Radius.circular(widget.isMe ? AppRadius.xs : AppRadius.md),
            ),
            boxShadow: widget.isMe
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
                    widget.time,
                    style: TextStyle(
                      color: widget.isMe
                          ? Colors.white70
                          : (isDark
                              ? AppColors.darkTextMuted
                              : AppColors.lightTextMuted),
                      fontSize: 8.5,
                    ),
                  ),
                  if (widget.isMe) ...[
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
      ),
    );
  }
}
