import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../../shared/widgets/verified_badge.dart';
import '../../../shared/widgets/optimized_network_image.dart';
import '../widgets/subscription_tier_card.dart';

class CreatorProfileDetailsScreen extends StatefulWidget {
  final String username;
  final String avatarUrl;
  final bool isVerified;

  const CreatorProfileDetailsScreen({
    super.key,
    required this.username,
    required this.avatarUrl,
    required this.isVerified,
  });

  @override
  State<CreatorProfileDetailsScreen> createState() =>
      _CreatorProfileDetailsScreenState();
}

class _CreatorProfileDetailsScreenState
    extends State<CreatorProfileDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Custom mock database for this creator
  late String _creatorBio;
  late String _subPrice;
  late String _subDescription;
  late String _creatorNiche;

  late List<Map<String, dynamic>> _publicPosts;
  late List<Map<String, dynamic>> _lockedPosts;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    // Resolve details based on creator username (Title Case or sentence case, strictly no uppercase)
    if (widget.username.contains('alexandra')) {
      _creatorNiche = 'Digital creator & 3d artist';
      _creatorBio = 'Digital painter & 3D environment artist. ';
      _subPrice = 'Rs 499/mo';
      _subDescription =
          'Unlock complete high-definition tutorial sets, direct chat replies, and custom brushes catalog.';
    } else if (widget.username.contains('premium')) {
      _creatorNiche = 'Professional photographer';
      _creatorBio = 'Travel & portrait photography expert. ';
      _subPrice = 'Rs 799/mo';
      _subDescription =
          'Unlock all photo collections, exclusive wallpapers, and private messaging.';
    } else {
      _creatorNiche = 'Fitness & wellness coach';
      _creatorBio = 'Fitness and lifestyle enthusiast. ';
      _subPrice = 'Rs 399/mo';
      _subDescription =
          'Get daily workout guides, recipe breakdowns, and motivational audio reels.';
    }

    _publicPosts = [
      {
        'id': '${widget.username}_pub_1',
        'image': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
        'caption':
            'Behind the scenes at my design studio working on a new canvas! ',
        'likes': 380,
      },
      {
        'id': '${widget.username}_pub_2',
        'image': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
        'caption':
            'Finding alignment and peace of mind during late night sessions. ',
        'likes': 295,
      },
      {
        'id': '${widget.username}_pub_3',
        'image': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
        'caption': 'A quick look at the workflow today. Keep pushing limits! ',
        'likes': 510,
      },
    ];

    _lockedPosts = [
      {
        'id': '${widget.username}_lock_1',
        'image': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
        'caption':
            'Premium photography set (Unreleased RAW high-res files collection) ',
        'price': 'Rs 799',
      },
      {
        'id': '${widget.username}_lock_2',
        'image': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
        'caption':
            'Full masterclass tutorial - detailed step-by-step breakdown (25 mins HD) ',
        'price': 'Rs 1,299',
      },
    ];
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showReportDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reasons = [
      'Spam or misleading',
      'Copyright violation',
      'Inappropriate content',
      'Harassment'
    ];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        title: const Text('Report Creator Account',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: reasons
              .map((reason) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(reason, style: const TextStyle(fontSize: 13)),
                    onTap: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text(
                              'Report submitted for review. Thank you for keeping Felbic safe! '),
                          backgroundColor: isDark
                              ? AppColors.darkSuccess
                              : AppColors.lightSuccess,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ))
              .toList(),
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
        ],
      ),
    );
  }

  void _showMoreActionsSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isBlocked =
        DemoAppState.instance.blockedCreators.contains(widget.username);

    showModalBottomSheet(
      context: context,
      backgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.share_rounded),
              title: const Text('Share Profile'),
              subtitle: const Text('Copy public profile URL to clipboard'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Profile link copied to clipboard! '),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.flag_outlined),
              title: const Text('Report Account'),
              subtitle: const Text('Flag this creator profile for review'),
              onTap: () {
                Navigator.pop(context);
                _showReportDialog(context);
              },
            ),
            ListTile(
              leading: Icon(
                Icons.block_rounded,
                color: isDark ? AppColors.darkAccent : AppColors.lightAccent,
              ),
              title: Text(isBlocked ? 'Unblock Creator' : 'Block Creator'),
              subtitle: Text(isBlocked
                  ? 'Allow creator interaction'
                  : 'Restrict creator interaction'),
              onTap: () {
                Navigator.pop(context);
                final nowBlocked =
                    DemoAppState.instance.toggleBlock(widget.username);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(nowBlocked
                        ? 'Successfully blocked @${widget.username}.'
                        : 'Unblocked @${widget.username}.'),
                    backgroundColor:
                        isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showUnlockConfirmationDialog(
      BuildContext context, Map<String, dynamic> post) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final priceStr = post['price'] as String? ?? 'Rs 399';
    final cleanPriceStr = priceStr.replaceAll(RegExp(r'[^0-9.]'), '');
    final price = double.tryParse(cleanPriceStr) ?? 399.0;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        title: const Text('Unlock Exclusive Content',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Text(
          'Unlock this exclusive media from @${widget.username} for $priceStr? This amount will be deducted from your wallet.',
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
              final success = DemoAppState.instance.unlockPost(
                id: post['id'] as String,
                price: price,
                image: post['image'] as String,
                creator: widget.username,
                caption: post['caption'] as String,
              );
              if (!success) {
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

              setState(() {});
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                      'Content from @${widget.username} unlocked successfully! '),
                  backgroundColor:
                      isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: Text(
              'Unlock Now',
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

  void _showPostDetailSheet(Map<String, dynamic> post) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color:
                        isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    borderRadius: AppRadius.rFull,
                  ),
                ),
              ),
              Row(
                children: [
                  UserAvatar(imageUrl: widget.avatarUrl, radius: 18),
                  AppSpacing.gapSM,
                  Flexible(
                    child: Text(
                      widget.username,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                  if (widget.isVerified) const VerifiedBadge(),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              AppSpacing.gapMD,
              ClipRRect(
                borderRadius: AppRadius.rMD,
                child: OptimizedNetworkImage(
                  imageUrl: post['image'] as String,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  cacheExtentMultiplier: 1.25,
                ),
              ),
              AppSpacing.gapMD,
              Text(
                '${post['likes']} likes',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              AppSpacing.gapXS,
              RichText(
                text: TextSpan(
                  style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                    fontSize: 13,
                    fontFamily: 'Inter',
                    height: 1.4,
                  ),
                  children: [
                    TextSpan(
                      text: '${widget.username} ',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    TextSpan(text: post['caption'] as String),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final textMutedColor =
        isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;

    return AnimatedBuilder(
      animation: DemoAppState.instance,
      builder: (context, _) {
        final isSubscribed =
            DemoAppState.instance.subscribedCreators.contains(widget.username);
        final hasAlerts =
            DemoAppState.instance.creatorAlerts.contains(widget.username);
        final isBlocked =
            DemoAppState.instance.blockedCreators.contains(widget.username);

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 24),
              onPressed: () => Navigator.pop(context),
            ),
            title: Row(
              children: [
                Flexible(
                  child: Text(
                    widget.username,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                if (widget.isVerified) const VerifiedBadge(),
              ],
            ),
            actions: [
              // Notification Alert Toggle Icon
              IconButton(
                icon: Icon(
                  hasAlerts
                      ? Icons.notifications_active_rounded
                      : Icons.notifications_rounded,
                  size: 26,
                  color: hasAlerts
                      ? primaryColor
                      : (isDark
                          ? AppColors.darkTextMain
                          : AppColors.lightTextMain),
                ),
                onPressed: () {
                  final nowAlert =
                      DemoAppState.instance.toggleAlerts(widget.username);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(nowAlert
                          ? 'Post alerts enabled for @${widget.username}! '
                          : 'Post alerts muted for @${widget.username}.'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
              // More Actions Options Icon
              IconButton(
                icon: const Icon(Icons.more_vert_rounded, size: 26),
                onPressed: () => _showMoreActionsSheet(context),
              ),
            ],
            elevation: 0.5,
          ),
          body: ListView(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md, vertical: AppSpacing.md),
            children: [
              // Avatar & Statistics Row
              Container(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                child: Row(
                  children: [
                    UserAvatar(imageUrl: widget.avatarUrl, radius: 36),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildStat('5', 'posts', isDark),
                          _buildStat('12.4k', 'fans', isDark),
                          _buildStat('45.2k', 'likes', isDark),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              AppSpacing.gapMD,

              // If blocked, render a custom gorgeous blocked state placeholder instead of grids/bio
              if (isBlocked) ...[
                AppSpacing.gapLG,
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkBorder.withOpacity(0.08)
                        : AppColors.lightBorder.withOpacity(0.08),
                    borderRadius: AppRadius.rMD,
                    border: Border.all(
                      color:
                          isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.block_rounded,
                          size: 44, color: AppColors.lightAccent),
                      AppSpacing.gapSM,
                      const Text(
                        'Creator blocked',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      AppSpacing.gapXS,
                      Text(
                        'You have blocked @${widget.username}. Unblock them from the options menu at the top right to view their profile feed.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: textMutedColor,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 100),
              ] else ...[
                // Bio details (Alexandra Art name removed to prevent duplication, using proper sentence-case titles)
                Text(
                  _creatorNiche,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: primaryColor,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _creatorBio,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                    height: 1.45,
                  ),
                ),
                AppSpacing.gapLG,

                // Refactored SubscriptionTierCard with standard dynamic themes
                Container(
                  decoration: BoxDecoration(
                    borderRadius: AppRadius.rMD,
                    boxShadow: [
                      BoxShadow(
                        color: primaryColor.withOpacity(isDark ? 0.05 : 0.03),
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: SubscriptionTierCard(
                    title: 'VIP Subscriber Tier',
                    priceLabel: _subPrice,
                    description: _subDescription,
                    isSubscribed: isSubscribed,
                    onSubscribePressed: () {
                      final nowSubbed = DemoAppState.instance
                          .toggleSubscribe(widget.username);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(nowSubbed
                              ? 'Subscribed to @${widget.username}! '
                              : 'Unsubscribed from @${widget.username}.'),
                          backgroundColor: nowSubbed
                              ? (isDark
                                  ? AppColors.darkSuccess
                                  : AppColors.lightSuccess)
                              : (isDark
                                  ? AppColors.darkBorder
                                  : AppColors.lightBorder),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                ),
                AppSpacing.gapLG,

                // Tab bars (sentence case, strictly no uppercase)
                Container(
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: isDark
                            ? AppColors.darkBorder
                            : AppColors.lightBorder,
                        width: 0.5,
                      ),
                    ),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    indicatorColor: primaryColor,
                    indicatorWeight: 2,
                    labelColor: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                    unselectedLabelColor: textMutedColor,
                    labelStyle: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13),
                    unselectedLabelStyle: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13),
                    tabs: const [
                      Tab(text: 'Public Feed'),
                      Tab(text: 'Exclusive Feed'),
                    ],
                  ),
                ),
                AppSpacing.gapMD,

                // Grid items based on Tab Controller
                SizedBox(
                  height: 250,
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      // Public Tab
                      GridView.builder(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 6,
                          mainAxisSpacing: 6,
                        ),
                        itemCount: _publicPosts.length,
                        itemBuilder: (context, index) {
                          final post = _publicPosts[index];
                          return GestureDetector(
                            onTap: () => _showPostDetailSheet(post),
                            child: ClipRRect(
                              borderRadius: AppRadius.rSM,
                              child: OptimizedNetworkImage(
                                imageUrl: post['image'] as String,
                                fit: BoxFit.cover,
                                cacheExtentMultiplier: 0.8,
                              ),
                            ),
                          );
                        },
                      ),

                      // Premium/Exclusive Tab (Completely fixed 398px bottom overflow using a elegant blur thumbnail)
                      GridView.builder(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 6,
                          mainAxisSpacing: 6,
                        ),
                        itemCount: _lockedPosts.length,
                        itemBuilder: (context, index) {
                          final post = _lockedPosts[index];
                          final isUnlocked = DemoAppState
                              .instance.unlockedPostIds
                              .contains(post['id']);

                          return GestureDetector(
                            onTap: isUnlocked
                                ? () => _showPostDetailSheet(post)
                                : () => _showUnlockConfirmationDialog(
                                    context, post),
                            child: ClipRRect(
                              borderRadius: AppRadius.rSM,
                              child: Stack(
                                children: [
                                  Positioned.fill(
                                    child: OptimizedNetworkImage(
                                      imageUrl: post['image'] as String,
                                      fit: BoxFit.cover,
                                      cacheExtentMultiplier: 0.55,
                                    ),
                                  ),
                                  if (!isUnlocked) ...[
                                    // Blur overlay for locked grid item thumbnail to ensure perfect layout fitting
                                    Positioned.fill(
                                      child: ImageFiltered(
                                        imageFilter: ImageFilter.blur(
                                            sigmaX: 8.0, sigmaY: 8.0),
                                        child: OptimizedNetworkImage(
                                          imageUrl: post['image'] as String,
                                          fit: BoxFit.cover,
                                          cacheExtentMultiplier: 0.55,
                                        ),
                                      ),
                                    ),
                                    Positioned.fill(
                                      child: Container(
                                        color: Colors.black.withOpacity(0.4),
                                      ),
                                    ),
                                    const Center(
                                      child: Icon(
                                        Icons.lock_rounded,
                                        color: Colors.white,
                                        size: 22,
                                      ),
                                    ),
                                    Positioned(
                                      bottom: 4,
                                      left: 4,
                                      right: 4,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 2, horizontal: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withOpacity(0.6),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          post['price'] as String,
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                  if (isUnlocked)
                                    const Positioned(
                                      top: 4,
                                      right: 4,
                                      child: CircleAvatar(
                                        radius: 9,
                                        backgroundColor: Colors.white,
                                        child: Icon(Icons.lock_open_rounded,
                                            size: 10,
                                            color: AppColors.lightSuccess),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildStat(String value, String label, bool isDark) {
    final textMainColor =
        isDark ? AppColors.darkTextMain : AppColors.lightTextMain;
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 17,
            color: textMainColor, // Organic theme-wise text colors
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label, // lowercase labels
          style: TextStyle(
            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
