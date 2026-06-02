import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:feebic_mobile/features/shared/widgets/locked_content_card.dart';
import 'package:feebic_mobile/features/shared/widgets/optimized_network_image.dart';
import 'package:feebic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:feebic_mobile/features/shared/widgets/verified_badge.dart';
import 'package:feebic_mobile/features/shared/widgets/video_player_card.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../profile/presentation/screens/creator_profile_details_screen.dart';

class FeedCard extends StatefulWidget {
  const FeedCard({
    super.key,
    required this.username,
    required this.avatarUrl,
    required this.isVerified,
    required this.caption,
    required this.likes,
    required this.comments,
    required this.postId,
    required this.onLikePressed,
    required this.onCommentPressed,
    required this.onUnlockPressed,
    this.imageUrl,
    this.videoUrl,
    this.isLocked = false,
    this.unlockPrice,
    this.isVideo = false,
  });

  final String username;
  final String avatarUrl;
  final bool isVerified;
  final String caption;
  final String? imageUrl;
  final String? videoUrl;
  final bool isLocked;
  final String? unlockPrice;
  final bool isVideo;
  final int likes;
  final int comments;
  final String postId;
  final VoidCallback onLikePressed;
  final VoidCallback onCommentPressed;
  final VoidCallback onUnlockPressed;

  @override
  State<FeedCard> createState() => _FeedCardState();
}

class _FeedCardState extends State<FeedCard> {
  bool _isLiked = false;
  late int _likesCount;
  late int _commentsCount;
  late bool _isBookmarked;
  late bool _isLockedState;
  final List<String> _comments = <String>[];

  @override
  void initState() {
    super.initState();
    _likesCount = widget.likes;
    _commentsCount = widget.comments;
    _isLockedState = widget.isLocked &&
        !DemoAppState.instance.unlockedPostIds.contains(widget.postId);
    _isBookmarked = DemoAppState.instance.savedPostIds.contains(widget.postId);
  }

  double _priceValue() {
    final label = widget.unlockPrice ?? 'Rs 399';
    return double.tryParse(
          label
              .replaceAll('Rs ', '')
              .replaceAll('\$', '')
              .replaceAll(',', '')
              .trim(),
        ) ??
        399;
  }

  void _openCreatorProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreatorProfileDetailsScreen(
          username: widget.username,
          avatarUrl: widget.avatarUrl,
          isVerified: widget.isVerified,
        ),
      ),
    );
  }

  void _showUnlockConfirmationDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final price = _priceValue();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        title: const Text('Unlock Exclusive Content',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Text(
          'Unlock this media piece from @${widget.username} for ${widget.unlockPrice ?? "Rs 399"}? This amount will be deducted from your wallet.',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel',
                style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMuted
                        : AppColors.lightTextMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              final unlocked = DemoAppState.instance.unlockPost(
                id: widget.postId,
                price: price,
                image: widget.imageUrl ?? '',
                creator: widget.username,
                caption: widget.caption,
              );
              if (!unlocked) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text(
                        'Insufficient wallet balance. Add funds in Wallet.'),
                    backgroundColor:
                        isDark ? AppColors.darkAccent : AppColors.lightAccent,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                return;
              }

              setState(() => _isLockedState = false);
              widget.onUnlockPressed();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Content from @${widget.username} unlocked.'),
                  backgroundColor:
                      isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: Text(
              'Confirm',
              style: TextStyle(
                  color:
                      isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                  fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  void _showPostMenu() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_add_alt_1_rounded),
              title: Text('Subscribe to @${widget.username}'),
              subtitle: const Text('Preview subscription tiers and benefits.'),
              onTap: () {
                Navigator.pop(context);
                _toggleSubscribe();
              },
            ),
            ListTile(
              leading: const Icon(Icons.notifications_active_outlined),
              title: const Text('Turn on post alerts'),
              onTap: () {
                Navigator.pop(context);
                DemoAppState.instance.toggleAlerts(widget.username);
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Post alerts updated.')));
              },
            ),
            ListTile(
              leading: const Icon(Icons.flag_outlined),
              title: const Text('Report post'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Report submitted for review.')));
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCommentsSheet() {
    final controller = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.md,
            right: AppSpacing.md,
            top: AppSpacing.md,
            bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Comments',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              AppSpacing.gapSM,
              if (_comments.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                  child: Text('No comments yet. Start the conversation.'),
                )
              else
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 250),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _comments.length,
                    itemBuilder: (context, index) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: const CircleAvatar(
                          radius: 14, child: Icon(Icons.person, size: 14)),
                      title: const Text('you',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12)),
                      subtitle: Text(_comments[index]),
                    ),
                  ),
                ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      decoration:
                          const InputDecoration(hintText: 'Add a comment...'),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send_rounded),
                    onPressed: () {
                      final text = controller.text.trim();
                      if (text.isEmpty) return;
                      setState(() {
                        _comments.add(text);
                        _commentsCount += 1;
                      });
                      setSheetState(() {});
                      controller.clear();
                      widget.onCommentPressed();
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _toggleSubscribe() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nowSubscribed =
        DemoAppState.instance.toggleSubscribe(widget.username);
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(nowSubscribed
            ? 'Subscribed to @${widget.username}.'
            : 'Unsubscribed from @${widget.username}.'),
        backgroundColor: nowSubscribed
            ? (isDark ? AppColors.darkSuccess : AppColors.lightSuccess)
            : null,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _sharePost() {
    Clipboard.setData(
        ClipboardData(text: 'https://felbic.app/post/${widget.postId}'));
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Post link copied.')));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isSubscribed =
        DemoAppState.instance.subscribedCreators.contains(widget.username);

    return RepaintBoundary(
      child: ColoredBox(
        color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: _openCreatorProfile,
                    child: UserAvatar(imageUrl: widget.avatarUrl, radius: 18),
                  ),
                  AppSpacing.gapSM,
                  GestureDetector(
                    onTap: _openCreatorProfile,
                    child: Text(
                      widget.username,
                      style: theme.textTheme.bodyLarge
                          ?.copyWith(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                  ),
                  if (widget.isVerified) const VerifiedBadge(),
                  AppSpacing.gapSM,
                  GestureDetector(
                    onTap: _toggleSubscribe,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isSubscribed
                            ? Colors.transparent
                            : (isDark
                                ? AppColors.darkPrimary
                                : AppColors.lightPrimary),
                        borderRadius: AppRadius.rFull,
                        border: Border.all(
                          color: isSubscribed
                              ? (isDark
                                  ? AppColors.darkBorder
                                  : AppColors.lightBorder)
                              : (isDark
                                  ? AppColors.darkPrimary
                                  : AppColors.lightPrimary),
                        ),
                      ),
                      child: Text(
                        isSubscribed ? 'Subscribed' : 'Subscribe',
                        style: TextStyle(
                          color: isSubscribed
                              ? (isDark
                                  ? AppColors.darkTextMuted
                                  : AppColors.lightTextMuted)
                              : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.more_horiz, size: 20),
                    onPressed: _showPostMenu,
                    color: isDark
                        ? AppColors.darkTextMuted
                        : AppColors.lightTextMuted,
                  ),
                ],
              ),
            ),
            if (widget.imageUrl != null) _buildMedia(),
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(
                        _isLiked
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        size: 22),
                    color: _isLiked
                        ? (isDark
                            ? AppColors.darkAccent
                            : AppColors.lightAccent)
                        : (isDark
                            ? AppColors.darkTextMain
                            : AppColors.lightTextMain),
                    onPressed: () {
                      setState(() {
                        _isLiked = !_isLiked;
                        _likesCount += _isLiked ? 1 : -1;
                      });
                      widget.onLikePressed();
                    },
                  ),
                  Text('$_likesCount',
                      style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  AppSpacing.gapSM,
                  IconButton(
                    icon:
                        const Icon(Icons.chat_bubble_outline_rounded, size: 20),
                    onPressed: _showCommentsSheet,
                    color: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                  ),
                  Text('$_commentsCount',
                      style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  IconButton(
                    icon: const Icon(Icons.ios_share_rounded, size: 20),
                    onPressed: _sharePost,
                    color: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(
                        _isBookmarked
                            ? Icons.bookmark_rounded
                            : Icons.bookmark_border_rounded,
                        size: 22),
                    color: _isBookmarked
                        ? (isDark
                            ? AppColors.darkPrimary
                            : AppColors.lightPrimary)
                        : (isDark
                            ? AppColors.darkTextMain
                            : AppColors.lightTextMain),
                    onPressed: () {
                      final isSaved =
                          DemoAppState.instance.toggleSaved(widget.postId);
                      setState(() => _isBookmarked = isSaved);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(isSaved
                                ? 'Saved to collection.'
                                : 'Removed from saved.')),
                      );
                    },
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(
                  left: AppSpacing.lg,
                  right: AppSpacing.lg,
                  bottom: AppSpacing.md),
              child: RichText(
                text: TextSpan(
                  style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                    fontSize: 13,
                    fontFamily: 'Inter',
                  ),
                  children: [
                    TextSpan(
                        text: '${widget.username} ',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    TextSpan(text: widget.caption),
                  ],
                ),
              ),
            ),
            Divider(
                height: 1,
                color: isDark
                    ? AppColors.darkBorder.withOpacity(0.4)
                    : AppColors.lightBorder.withOpacity(0.4)),
          ],
        ),
      ),
    );
  }

  Widget _buildMedia() {
    if (widget.isVideo) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: VideoPlayerCard(
          placeholderImageUrl: widget.imageUrl!,
          videoUrl: widget.videoUrl ?? widget.imageUrl!,
          priceLabel: widget.unlockPrice ?? 'Rs 399',
          isLocked: _isLockedState,
          onUnlockPressed: _showUnlockConfirmationDialog,
        ),
      );
    }

    return AspectRatio(
      aspectRatio: 1.1,
      child: _isLockedState
          ? LockedContentCard(
              placeholderImageUrl: widget.imageUrl!,
              priceLabel: widget.unlockPrice ?? 'Rs 399',
              onUnlockPressed: _showUnlockConfirmationDialog,
            )
          : OptimizedNetworkImage(
              imageUrl: widget.imageUrl!,
              fit: BoxFit.cover,
            ),
    );
  }
}
