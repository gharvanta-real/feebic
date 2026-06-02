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
  final List<Key> _heartOverlayKeys = <Key>[];

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

  void _triggerDoubleTapLike() {
    if (_isLockedState) {
      _showUnlockConfirmationDialog();
      return;
    }
    if (!_isLiked) {
      setState(() {
        _isLiked = true;
        _likesCount += 1;
      });
      widget.onLikePressed();
    }
    
    HapticFeedback.mediumImpact();

    final key = UniqueKey();
    setState(() {
      _heartOverlayKeys.add(key);
    });
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() {
          _heartOverlayKeys.remove(key);
        });
      }
    });
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.sm,
          bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Comments',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                Text(
                  '$_commentsCount responses',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                  ),
                ),
              ],
            ),
            AppSpacing.gapSM,
            const Divider(),
            if (_comments.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Column(
                    children: [
                      Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 28,
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                      AppSpacing.gapSM,
                      Text(
                        'No comments yet.',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Start the conversation below.',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 250),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: _comments.length,
                  itemBuilder: (context, index) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                          child: Icon(
                            Icons.person,
                            size: 12,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                        ),
                        AppSpacing.gapSM,
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text(
                                    'you',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Just now',
                                    style: TextStyle(
                                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                      fontSize: 9,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _comments[index],
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            AppSpacing.gapSM,
            Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkBorder.withOpacity(0.3) : AppColors.lightBorder.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: TextField(
                      controller: controller,
                      style: const TextStyle(fontSize: 13),
                      decoration: const InputDecoration(
                        hintText: 'Add a comment...',
                        border: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: Icon(Icons.send_rounded, color: primary),
                  onPressed: () {
                    final text = controller.text.trim();
                    if (text.isEmpty) return;
                    HapticFeedback.lightImpact();
                    setState(() {
                      _comments.add(text);
                      _commentsCount += 1;
                    });
                    Navigator.pop(context);
                    _showCommentsSheet();
                    widget.onCommentPressed();
                  },
                ),
              ],
            ),
          ],
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
            if (widget.imageUrl != null)
              Stack(
                alignment: Alignment.center,
                children: [
                  GestureDetector(
                    onDoubleTap: _triggerDoubleTapLike,
                    child: _buildMedia(),
                  ),
                  ..._heartOverlayKeys.map((key) => HeartPopOverlay(key: key)),
                ],
              ),
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
              child: Row(
                children: [
                  SpringIconButton(
                    icon: Icon(
                        _isLiked
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        color: _isLiked
                            ? (isDark
                                ? AppColors.darkAccent
                                : AppColors.lightAccent)
                            : (isDark
                                ? AppColors.darkTextMain
                                : AppColors.lightTextMain),
                        size: 22),
                    onPressed: () {
                      HapticFeedback.lightImpact();
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
                  SpringIconButton(
                    icon: Icon(Icons.chat_bubble_outline_rounded,
                        color: isDark
                            ? AppColors.darkTextMain
                            : AppColors.lightTextMain,
                        size: 20),
                    onPressed: _showCommentsSheet,
                  ),
                  Text('$_commentsCount',
                      style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  SpringIconButton(
                    icon: Icon(Icons.ios_share_rounded,
                        color: isDark
                            ? AppColors.darkTextMain
                            : AppColors.lightTextMain,
                        size: 20),
                    onPressed: _sharePost,
                  ),
                  const Spacer(),
                  SpringIconButton(
                    icon: Icon(
                        _isBookmarked
                            ? Icons.bookmark_rounded
                            : Icons.bookmark_border_rounded,
                        color: _isBookmarked
                            ? (isDark
                                ? AppColors.darkPrimary
                                : AppColors.lightPrimary)
                            : (isDark
                                ? AppColors.darkTextMain
                                : AppColors.lightTextMain),
                        size: 22),
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

class SpringIconButton extends StatefulWidget {
  const SpringIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
  });

  final Widget icon;
  final VoidCallback onPressed;

  @override
  State<SpringIconButton> createState() => _SpringIconButtonState();
}

class _SpringIconButtonState extends State<SpringIconButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onPressed();
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scale,
        child: Container(
          color: Colors.transparent,
          padding: const EdgeInsets.all(8),
          child: widget.icon,
        ),
      ),
    );
  }
}

class HeartPopOverlay extends StatefulWidget {
  const HeartPopOverlay({super.key});

  @override
  State<HeartPopOverlay> createState() => _HeartPopOverlayState();
}

class _HeartPopOverlayState extends State<HeartPopOverlay> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.25).chain(CurveTween(curve: Curves.easeOutBack)), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.25, end: 1.0), weight: 30),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0).chain(CurveTween(curve: Curves.easeIn)), weight: 30),
    ]).animate(_controller);

    _opacity = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.0), weight: 25),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.0), weight: 45),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0), weight: 30),
    ]).animate(_controller);

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _opacity.value,
          child: ScaleTransition(
            scale: _scale,
            child: const Icon(
              Icons.favorite_rounded,
              color: Colors.white,
              size: 72,
              shadows: [
                Shadow(
                  color: Colors.black38,
                  blurRadius: 8,
                  offset: Offset(0, 3),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
