import 'package:flutter/material.dart';
import 'package:felbic_mobile/features/shared/widgets/verified_badge.dart';
import 'package:felbic_mobile/features/shared/widgets/user_avatar.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/post_model.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../screens/settings_screen.dart';
import '../screens/creator_hub_screen.dart';
import '../screens/creator_posts_screen.dart';
import 'profile_stats.dart';
import 'perspective_toggle.dart';

class CreatorProfileView extends StatefulWidget {
  const CreatorProfileView({super.key});

  @override
  State<CreatorProfileView> createState() => _CreatorProfileViewState();
}

class _CreatorProfileViewState extends State<CreatorProfileView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<PostModel> _publicPosts = [];
  List<PostModel> _lockedPosts = [];
  bool _isLoadingPosts = true;
  int _postsCount = 0;
  int _fansCount = 0;
  int _likesCount = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchPosts();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchPosts() async {
    final auth = getIt<AuthSession>();
    final username = auth.user?['username']?.toString() ??
        DemoAppState.instance.creatorUsername;

    setState(() => _isLoadingPosts = true);
    try {
      // Fetch creator info
      try {
        final infoResp = await getIt<ApiClient>()
            .get('/users/creator/$username');
        final info = Map<String, dynamic>.from(infoResp.data as Map);
        if (mounted) {
          setState(() {
            _postsCount = (info['posts_count'] ?? 0) as int;
            _fansCount = (info['fans_count'] ?? 0) as int;
            _likesCount = (info['likes_count'] ?? 0) as int;
          });
        }
      } catch (_) {}

      // Fetch own posts
      final response = await getIt<ApiClient>()
          .get('/posts', queryParameters: {'username': username});
      final List<dynamic> raw = response.data is List
          ? response.data as List
          : (response.data['posts'] ?? []) as List;
      final posts = raw
          .whereType<Map>()
          .map((e) => PostModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();

      if (!mounted) return;
      setState(() {
        _publicPosts = posts.where((p) => !p.isPremium).toList();
        _lockedPosts = posts.where((p) => p.isPremium).toList();
        _postsCount = posts.length;
        _isLoadingPosts = false;
      });
    } catch (e) {
      debugPrint('CreatorProfileView: error fetching posts: $e');
      if (mounted) setState(() => _isLoadingPosts = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: Listenable.merge([
        DemoAppState.instance,
        getIt<AuthSession>(),
      ]),
      builder: (context, _) {
        final state = DemoAppState.instance;
        final auth = getIt<AuthSession>();
        final user = auth.user ?? {};
        final username = user['username']?.toString() ?? state.creatorUsername;
        final name = user['display_name']?.toString() ?? state.creatorName;
        final bio = user['bio']?.toString() ?? state.creatorBio;
        final avatar = ApiClient.resolveUrl(
            user['avatar']?.toString() ?? state.creatorAvatar);
        final category = user['role']?.toString() == 'creator'
            ? state.creatorCategory
            : 'Creator Account';
        final link = user['website']?.toString() ?? state.creatorLink;

        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                const Icon(Icons.lock_person_rounded, size: 22),
                AppSpacing.gapXS,
                Flexible(
                  child: Text(username,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                AppSpacing.gapXXS,
                const VerifiedBadge(size: 15),
              ],
            ),
            actions: [
              const PerspectiveToggle(),
              IconButton(
                icon: const Icon(Icons.menu_rounded, size: 24),
                onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            const SettingsScreen(isCreatorMode: true))),
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: _fetchPosts,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Row(
                    children: [
                      UserAvatar(
                          imageUrl: avatar, radius: 36, hasStory: true),
                      const Spacer(),
                      ProfileStats(
                        postsCount: '$_postsCount',
                        followersCount: _fansCount > 999
                            ? '${(_fansCount / 1000).toStringAsFixed(1)}K'
                            : '$_fansCount',
                        subscribersCount: _likesCount > 999
                            ? '${(_likesCount / 1000).toStringAsFixed(1)}K'
                            : '$_likesCount',
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: theme.textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.bold, fontSize: 14)),
                      AppSpacing.gapXXS,
                      Text(category,
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? AppColors.darkTextMuted
                                  : AppColors.lightTextMuted)),
                      AppSpacing.gapXXS,
                      Text(bio,
                          style: TextStyle(
                              fontSize: 12,
                              height: 1.4,
                              color: isDark
                                  ? AppColors.darkTextMain
                                  : AppColors.lightTextMain)),
                      if (link.isNotEmpty) ...[
                        AppSpacing.gapXS,
                        Text(link,
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isDark
                                    ? AppColors.darkPrimary
                                    : AppColors.lightPrimary)),
                      ],
                    ],
                  ),
                ),
                AppSpacing.gapMD,
                _buildActions(context),
                AppSpacing.gapMD,
                TabBar(
                  controller: _tabController,
                  indicatorColor:
                      isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                  labelColor:
                      isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                  unselectedLabelColor: isDark
                      ? AppColors.darkTextMuted
                      : AppColors.lightTextMuted,
                  tabs: const [
                    Tab(icon: Icon(Icons.grid_on_rounded, size: 20)),
                    Tab(icon: Icon(Icons.lock_person_rounded, size: 24))
                  ],
                ),
                Expanded(
                  child: _isLoadingPosts
                      ? const Center(child: CircularProgressIndicator())
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            // Public grid
                            _buildPostGrid(_publicPosts, false, username),
                            // Locked/premium grid
                            _buildPostGrid(_lockedPosts, true, username),
                          ],
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPostGrid(
      List<PostModel> posts, bool isLocked, String username) {
    if (posts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 60),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isLocked ? Icons.lock_person_rounded : Icons.grid_on_rounded,
                size: 36,
                color: Colors.grey.withOpacity(0.4),
              ),
              const SizedBox(height: 10),
              Text(
                isLocked ? 'No premium posts yet' : 'No posts yet',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 4),
              Text(
                isLocked
                    ? 'Create premium content from the post composer'
                    : 'Your posts will appear here',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(2),
      addAutomaticKeepAlives: false,
      addRepaintBoundaries: true,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 3,
        mainAxisSpacing: 3,
      ),
      itemCount: posts.length,
      itemBuilder: (context, index) {
        final post = posts[index];
        final hasMedia = post.mediaUrls.isNotEmpty;

        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CreatorPostsScreen(
                  username: username,
                  posts: posts,
                  initialIndex: index,
                ),
              ),
            ).then((_) => _fetchPosts());
          },
          child: ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (hasMedia)
                  Image.network(
                    post.mediaUrls.first,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: Colors.grey.withOpacity(0.2),
                    ),
                  )
                else
                  Container(color: Colors.grey.withOpacity(0.15)),
                if (post.isPremium && post.isLocked)
                  Container(
                    color: Colors.black.withOpacity(0.35),
                    child: const Center(
                      child: Icon(Icons.lock_rounded,
                          color: Colors.white, size: 18),
                    ),
                  ),
                if (post.mediaType == 'video')
                  const Positioned(
                    top: 4,
                    left: 4,
                    child: Icon(Icons.play_circle_fill_rounded,
                        color: Colors.white, size: 14),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        children: [
          Expanded(
              child: OutlinedButton(
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const CreatorHubScreen())),
                  child: const Text('Creator Hub'))),
          AppSpacing.gapSM,
          Expanded(
              child: OutlinedButton(
                  onPressed: () => _shareProfile(context),
                  child: const Text('Share Profile'))),
        ],
      ),
    );
  }

  void _shareProfile(BuildContext context) {
    final auth = getIt<AuthSession>();
    final username = auth.user?['username']?.toString() ??
        DemoAppState.instance.creatorUsername;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('https://felbic.app/$username copied!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
