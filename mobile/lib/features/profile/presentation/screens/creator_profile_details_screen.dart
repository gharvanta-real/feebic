import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/post_model.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../../shared/widgets/verified_badge.dart';
import '../../../shared/widgets/optimized_network_image.dart';
import '../widgets/subscription_tier_card.dart';
import 'creator_posts_screen.dart';

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

  bool _isLoading = true;
  String? _errorMessage;

  // Resolved dynamic profile information
  String _displayName = '';
  String _creatorBio = '';
  String _creatorNiche = 'Creator Profile';
  String _subPrice = 'Rs 399/mo';
  final String _subDescription =
      'Unlock complete exclusive feeds, direct chat messaging, and private creator updates.';
  int _postsCount = 0;
  int _fansCount = 0;
  int _likesCount = 0;

  List<PostModel> _publicPosts = [];
  List<PostModel> _lockedPosts = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 1. Fetch Creator Info
      final infoResponse =
          await getIt<ApiClient>().get('/users/creator/${widget.username}');
      final infoData = Map<String, dynamic>.from(infoResponse.data as Map);

      // 2. Fetch Creator Posts
      final postsResponse = await getIt<ApiClient>()
          .get('/posts', queryParameters: {'username': widget.username});
      final List<dynamic> postsData = postsResponse.data is List
          ? postsResponse.data
          : (postsResponse.data['posts'] ?? []);

      final parsedPosts = postsData
          .whereType<Map>()
          .map((e) => PostModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();

      if (!mounted) return;
      setState(() {
        _displayName = infoData['display_name']?.toString() ?? widget.username;
        _creatorBio = infoData['bio']?.toString() ?? '';
        final location = infoData['location']?.toString() ?? '';
        _creatorNiche =
            location.isNotEmpty ? 'Based in $location' : 'Creator Profile';
        _subPrice = 'Rs ${(infoData['sub_price'] ?? 399.0) as num}/mo';
        _postsCount = (infoData['posts_count'] ?? parsedPosts.length) as int;
        _fansCount = (infoData['fans_count'] ?? 0) as int;
        _likesCount = (infoData['likes_count'] ?? 0) as int;

        _publicPosts = parsedPosts.where((p) => !p.isPremium).toList();
        _lockedPosts = parsedPosts.where((p) => p.isPremium).toList();
        _isLoading = false;
      });
    } on DioException catch (e) {
      debugPrint('Error loading creator details: $e');
      if (!mounted) return;
      setState(() {
        _errorMessage = e.response?.data?['error']?.toString() ??
            'Failed to load profile details';
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading creator details: $e');
      if (!mounted) return;
      setState(() {
        _errorMessage = 'An error occurred while loading profile details';
        _isLoading = false;
      });
    }
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

  void _showUnlockConfirmationDialog(BuildContext context, PostModel post) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final priceStr = 'Rs ${post.price.toStringAsFixed(0)}';

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
            onPressed: () async {
              Navigator.pop(context);
              try {
                final response = await getIt<ApiClient>()
                    .post('/posts/${post.id}/unlock');
                if (response.statusCode == 200) {
                  setState(() {
                    post.isLocked = false;
                    post.isUnlocked = true;
                  });
                  if (!mounted) return;
                  ScaffoldMessenger.of(this.context).showSnackBar(
                    SnackBar(
                      content: Text(
                          'Content from @${widget.username} unlocked successfully! '),
                      backgroundColor: isDark
                          ? AppColors.darkSuccess
                          : AppColors.lightSuccess,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  _fetchData();
                }
              } on DioException catch (e) {
                final errMsg =
                    e.response?.data?['error'] ?? 'Unlock transaction failed';
                if (!mounted) return;
                ScaffoldMessenger.of(this.context).showSnackBar(
                  SnackBar(
                    content: Text(errMsg),
                    backgroundColor:
                        isDark ? AppColors.darkAccent : AppColors.lightAccent,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(this.context).showSnackBar(
                  SnackBar(
                    content: const Text(
                        'Unlock transaction failed. Please check wallet balance.'),
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
                  color:
                      isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                  fontWeight: FontWeight.bold),
            ),
          ),
        ],
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
                    _displayName.isNotEmpty ? _displayName : widget.username,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                if (widget.isVerified) const VerifiedBadge(),
              ],
            ),
            actions: [
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
              IconButton(
                icon: const Icon(Icons.more_vert_rounded, size: 26),
                onPressed: () => _showMoreActionsSheet(context),
              ),
            ],
            elevation: 0.5,
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _errorMessage != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline_rounded,
                                size: 40,
                                color: Theme.of(context).colorScheme.error),
                            AppSpacing.gapSM,
                            Text(_errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 14)),
                            AppSpacing.gapMD,
                            ElevatedButton.icon(
                              onPressed: _fetchData,
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('Try Again'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchData,
                      child: NestedScrollView(
                        headerSliverBuilder: (context, innerBoxIsScrolled) {
                          return [
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.all(AppSpacing.md),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Avatar & Statistics Row
                                    Row(
                                      children: [
                                        UserAvatar(
                                            imageUrl: widget.avatarUrl,
                                            radius: 36),
                                        Expanded(
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceEvenly,
                                            children: [
                                              _buildStat('$_postsCount',
                                                  'posts', isDark),
                                              _buildStat('$_fansCount', 'fans',
                                                  isDark),
                                              _buildStat('$_likesCount',
                                                  'likes', isDark),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    AppSpacing.gapMD,

                                    if (isBlocked) ...[
                                      AppSpacing.gapLG,
                                      Container(
                                        padding:
                                            const EdgeInsets.all(AppSpacing.lg),
                                        decoration: BoxDecoration(
                                          color: isDark
                                              ? AppColors.darkBorder
                                                  .withOpacity(0.08)
                                              : AppColors.lightBorder
                                                  .withOpacity(0.08),
                                          borderRadius: AppRadius.rMD,
                                          border: Border.all(
                                            color: isDark
                                                ? AppColors.darkBorder
                                                : AppColors.lightBorder,
                                          ),
                                        ),
                                        child: Column(
                                          children: [
                                            const Icon(Icons.block_rounded,
                                                size: 44,
                                                color: AppColors.lightAccent),
                                            AppSpacing.gapSM,
                                            const Text(
                                              'Creator blocked',
                                              style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 15),
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
                                              color: primaryColor.withOpacity(
                                                  isDark ? 0.05 : 0.03),
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
                                          onSubscribePressed: () async {
                                            final messenger =
                                                ScaffoldMessenger.of(context);
                                            final creatorUsername =
                                                widget.username;
                                            if (isSubscribed) {
                                              try {
                                                final response = await getIt<
                                                        ApiClient>()
                                                    .delete(
                                                        '/wallet/subscribe/$creatorUsername');
                                                if (response.statusCode ==
                                                    200) {
                                                  DemoAppState
                                                      .instance.subscribedCreators
                                                      .remove(creatorUsername);
                                                  DemoAppState.instance
                                                      .notifySubscribersChanged();
                                                  _fetchData();
                                                  if (!mounted) return;
                                                  messenger.showSnackBar(
                                                    SnackBar(
                                                      content: Text(
                                                          'Unsubscribed from @$creatorUsername.'),
                                                      behavior:
                                                          SnackBarBehavior
                                                              .floating,
                                                    ),
                                                  );
                                                }
                                              } catch (e) {
                                                if (!mounted) return;
                                                messenger.showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                        'Failed to cancel subscription. Please try again.'),
                                                    behavior:
                                                        SnackBarBehavior
                                                            .floating,
                                                  ),
                                                );
                                              }
                                            } else {
                                              try {
                                                final response =
                                                    await getIt<ApiClient>()
                                                        .post(
                                                  '/wallet/subscribe',
                                                  data: {
                                                    'creator_id':
                                                        creatorUsername
                                                  },
                                                );
                                                if (response.statusCode ==
                                                    200) {
                                                  DemoAppState
                                                      .instance.subscribedCreators
                                                      .add(creatorUsername);
                                                  DemoAppState.instance
                                                      .notifySubscribersChanged();
                                                  _fetchData();
                                                  if (!mounted) return;
                                                  messenger.showSnackBar(
                                                    SnackBar(
                                                      content: Text(
                                                          'Subscribed to @$creatorUsername!'),
                                                      backgroundColor: isDark
                                                          ? AppColors
                                                              .darkSuccess
                                                          : AppColors
                                                              .lightSuccess,
                                                      behavior:
                                                          SnackBarBehavior
                                                              .floating,
                                                    ),
                                                  );
                                                }
                                              } on DioException catch (e) {
                                                final errMsg = e
                                                        .response
                                                        ?.data?['error'] ??
                                                    'Failed to subscribe';
                                                if (!mounted) return;
                                                messenger.showSnackBar(
                                                  SnackBar(
                                                    content: Text(errMsg),
                                                    backgroundColor: isDark
                                                        ? AppColors.darkAccent
                                                        : AppColors.lightAccent,
                                                    behavior:
                                                        SnackBarBehavior
                                                            .floating,
                                                  ),
                                                );
                                              } catch (e) {
                                                if (!mounted) return;
                                                ScaffoldMessenger.of(this.context)
                                                    .showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                        'Failed to subscribe. Please try again.'),
                                                    behavior:
                                                        SnackBarBehavior
                                                            .floating,
                                                  ),
                                                );
                                              }
                                            }
                                          },
                                        ),
                                      ),
                                      AppSpacing.gapLG,
                                    ],
                                  ],
                                ),
                              ),
                            ),
                            if (!isBlocked)
                              SliverPersistentHeader(
                                pinned: true,
                                delegate: _SliverAppBarDelegate(
                                  TabBar(
                                    controller: _tabController,
                                    indicatorColor: primaryColor,
                                    indicatorWeight: 2,
                                    labelColor: isDark
                                        ? AppColors.darkTextMain
                                        : AppColors.lightTextMain,
                                    unselectedLabelColor: textMutedColor,
                                    labelStyle: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13),
                                    unselectedLabelStyle: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13),
                                    tabs: const [
                                      Tab(text: 'Public Feed'),
                                      Tab(text: 'Exclusive Feed'),
                                    ],
                                  ),
                                ),
                              ),
                          ];
                        },
                        body: isBlocked
                            ? const SizedBox.shrink()
                            : TabBarView(
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
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) =>
                                                  CreatorPostsScreen(
                                                username: widget.username,
                                                posts: _publicPosts,
                                                initialIndex: index,
                                              ),
                                            ),
                                          ).then((_) => _fetchData());
                                        },
                                        child: ClipRRect(
                                          borderRadius: AppRadius.rSM,
                                          child: OptimizedNetworkImage(
                                            imageUrl: post.mediaUrls.isNotEmpty
                                                ? post.mediaUrls.first
                                                : '',
                                            fit: BoxFit.cover,
                                            cacheExtentMultiplier: 0.8,
                                          ),
                                        ),
                                      );
                                    },
                                  ),

                                  // Premium/Exclusive Tab
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
                                      final isUnlocked = !post.isLocked;

                                      return GestureDetector(
                                        onTap: isUnlocked
                                            ? () {
                                                Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (context) =>
                                                        CreatorPostsScreen(
                                                      username: widget.username,
                                                      posts: _lockedPosts,
                                                      initialIndex: index,
                                                    ),
                                                  ),
                                                ).then((_) => _fetchData());
                                              }
                                            : () =>
                                                _showUnlockConfirmationDialog(
                                                    context, post),
                                        child: ClipRRect(
                                          borderRadius: AppRadius.rSM,
                                          child: Stack(
                                            children: [
                                              Positioned.fill(
                                                child: OptimizedNetworkImage(
                                                  imageUrl: post
                                                          .mediaUrls.isNotEmpty
                                                      ? post.mediaUrls.first
                                                      : '',
                                                  fit: BoxFit.cover,
                                                  cacheExtentMultiplier: 0.55,
                                                ),
                                              ),
                                              if (!isUnlocked) ...[
                                                Positioned.fill(
                                                  child: ImageFiltered(
                                                    imageFilter:
                                                        ImageFilter.blur(
                                                            sigmaX: 8.0,
                                                            sigmaY: 8.0),
                                                    child:
                                                        OptimizedNetworkImage(
                                                      imageUrl: post
                                                              .mediaUrls
                                                              .isNotEmpty
                                                          ? post
                                                              .mediaUrls.first
                                                          : '',
                                                      fit: BoxFit.cover,
                                                      cacheExtentMultiplier:
                                                          0.55,
                                                    ),
                                                  ),
                                                ),
                                                Positioned.fill(
                                                  child: Container(
                                                    color: Colors.black
                                                        .withOpacity(0.4),
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
                                                    padding: const EdgeInsets
                                                        .symmetric(
                                                        vertical: 2,
                                                        horizontal: 4),
                                                    decoration: BoxDecoration(
                                                      color: Colors.black
                                                          .withOpacity(0.6),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              4),
                                                    ),
                                                    child: Text(
                                                      'Rs ${post.price.toStringAsFixed(0)}',
                                                      textAlign:
                                                          TextAlign.center,
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontSize: 9,
                                                        fontWeight:
                                                            FontWeight.bold,
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
                                                    backgroundColor:
                                                        Colors.white,
                                                    child: Icon(
                                                        Icons.lock_open_rounded,
                                                        size: 10,
                                                        color: AppColors
                                                            .lightSuccess),
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
            color: textMainColor,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
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

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  _SliverAppBarDelegate(this._tabBar);

  final TabBar _tabBar;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
