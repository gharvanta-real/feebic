import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:dio/dio.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_loader.dart';
import '../../../chat/presentation/screens/chat_list_screen.dart';
import '../widgets/feed_card.dart';
import '../widgets/stories_bar.dart';
import 'create_post_screen.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/post_model.dart';
import '../../../notifications/presentation/screens/notifications_screen.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  List<PostModel> _posts = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _isLoadingCreatorStats = false;
  bool _creatorStatsRequested = false;
  bool _hasMore = true;
  int _page = 1;
  static const int _limit = 10;
  String? _errorMessage;
  double _creatorBalance = 0;
  int _creatorViews = 0;
  int _creatorSubscribers = 0;
  int _creatorLikes = 0;
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);
    _fetchPosts(reset: true);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients || _isLoading) return;
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 300 &&
        !_isLoadingMore &&
        _hasMore) {
      _fetchMorePosts();
    }
  }

  Future<void> _fetchMorePosts() async {
    if (_isLoading || _isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    try {
      final response = await getIt<ApiClient>()
          .get('/posts', queryParameters: {'page': _page, 'limit': _limit});
      if (response.statusCode == 200) {
        final data = _extractPostList(response.data);
        final newPosts = data
            .whereType<Map>()
            .map((e) => PostModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        if (!mounted) return;
        setState(() {
          _posts.addAll(newPosts);
          _page++;
          _hasMore = newPosts.length == _limit;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching more posts: $e');
      if (mounted) setState(() => _isLoadingMore = false);
    }
  }

  Future<void> _fetchCreatorStats() async {
    if (_isLoadingCreatorStats) return;
    setState(() => _isLoadingCreatorStats = true);
    try {
      final responses = await Future.wait([
        getIt<ApiClient>().get('/wallet'),
        getIt<ApiClient>().get(
          '/posts',
          queryParameters: {'page': 1, 'limit': 30},
        ),
        getIt<ApiClient>().get('/users/subscriptions'),
      ]);

      final wallet = responses[0].data is Map
          ? Map<String, dynamic>.from(responses[0].data as Map)
          : <String, dynamic>{};
      final posts = _extractPostList(responses[1].data)
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      final subscriptions =
          responses[2].data is List ? responses[2].data as List : <dynamic>[];

      if (!mounted) return;
      setState(() {
        _creatorBalance = ((wallet['balance'] ?? 0) as num).toDouble();
        _creatorLikes = posts.fold<int>(
          0,
          (total, post) => total + ((post['likes'] ?? 0) as num).toInt(),
        );
        _creatorViews = posts.length;
        _creatorSubscribers = subscriptions.length;
      });
    } catch (e) {
      debugPrint('Error loading creator stats: $e');
    } finally {
      if (mounted) {
        setState(() {
          _creatorStatsRequested = true;
          _isLoadingCreatorStats = false;
        });
      }
    }
  }

  Future<void> _fetchPosts({bool reset = false}) async {
    if (reset) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
        _page = 1;
        _hasMore = true;
      });
    } else {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }
    try {
      final response = await getIt<ApiClient>()
          .get('/posts', queryParameters: {'page': 1, 'limit': _limit});
      if (response.statusCode == 200) {
        final data = _extractPostList(response.data);
        final newPosts = data
            .whereType<Map>()
            .map((e) => PostModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        if (!mounted) return;
        setState(() {
          _posts = newPosts;
          _page = 2;
          _hasMore = newPosts.length == _limit;
        });
      } else {
        if (!mounted) return;
        setState(() => _errorMessage = 'Failed to load feed data');
      }
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final serverError = e.response?.data is Map
          ? e.response?.data['error']?.toString()
          : null;
      if (!mounted) return;
      setState(() {
        _errorMessage = serverError ??
            (status == null
                ? 'Connection error: API is not reachable.'
                : 'Feed error: server returned HTTP $status.');
      });
    } catch (e) {
      if (!mounted) return;
      setState(() =>
          _errorMessage = 'Feed data could not be parsed. Please refresh.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<dynamic> _extractPostList(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['posts'] is List) return data['posts'] as List;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return <dynamic>[];
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserModeCubit, UserMode>(
      builder: (context, mode) => mode == UserMode.creator
          ? _buildCreatorFeed(context)
          : _buildFanFeed(context),
    );
  }

  Widget _buildFanFeed(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'FELBIC',
          style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 20,
              letterSpacing: 1.2,
              color: AppColors.lightPrimary),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.favorite_border_rounded, size: 22),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const NotificationsScreen(),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.send_rounded, size: 20),
            onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const ChatListScreen())),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _fetchPosts(reset: true),
        child: _isLoading
            ? _buildSkeletonFeed()
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
                            onPressed: _fetchPosts,
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Try Again'),
                          ),
                        ],
                      ),
                    ),
                  )
                : _posts.isEmpty
                    ? ListView(
                        children: [
                          const StoriesBar(),
                          const Divider(height: 1),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 80),
                            child: Center(
                              child: Column(
                                children: [
                                  Icon(Icons.feed_outlined,
                                      size: 40,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withOpacity(0.4)),
                                  AppSpacing.gapSM,
                                  const Text('No posts yet',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15)),
                                  const SizedBox(height: 4),
                                  const Text('Be the first creator to post!',
                                      style: TextStyle(
                                          fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        itemCount: _posts.length + 1 + (_isLoadingMore ? 1 : 0),
                        addAutomaticKeepAlives: false,
                        addRepaintBoundaries: true,
                        cacheExtent: 1200,
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            return const Column(
                              children: [
                                StoriesBar(),
                                Divider(height: 1),
                              ],
                            );
                          }
                          // Infinite scroll loading footer
                          if (index == _posts.length + 1) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 24),
                              child: Center(
                                child: SizedBox(
                                  width: 24,
                                  height: 24,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                            );
                          }
                          final post = _posts[index - 1];
                          return FeedCard(
                            postId: post.id,
                            username: post.creatorUsername,
                            avatarUrl: post.creatorAvatar.isNotEmpty
                                ? post.creatorAvatar
                                : '',
                            isVerified: true,
                            caption: post.content,
                            imageUrl: post.mediaUrls.isNotEmpty
                                ? post.mediaUrls.first
                                : null,
                            videoUrl: post.mediaUrls.isNotEmpty &&
                                    post.mediaType == 'video'
                                ? post.mediaUrls.first
                                : null,
                            isLocked: post.isLocked,
                            unlockPrice: post.price > 0
                                ? 'Rs ${post.price.toStringAsFixed(0)}'
                                : null,
                            isVideo: post.mediaType == 'video',
                            likes: post.likes,
                            comments: post.commentsCount,
                            isLiked: post.isLiked,
                            isBookmarked: post.isBookmarked,
                            onLikePressed: () {},
                            onCommentPressed: () {},
                            onUnlockPressed: () {},
                            creatorId: post.creatorId,
                            category: post.category,
                          );
                        },
                      ),
      ),
    );
  }

  Widget _buildCreatorFeed(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (!_creatorStatsRequested && !_isLoadingCreatorStats) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _fetchCreatorStats();
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Creator Dashboard',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          TextButton.icon(
            icon:
                const Icon(Icons.add, size: 18, color: AppColors.lightPrimary),
            label: const Text('Post',
                style: TextStyle(
                    color: AppColors.lightPrimary,
                    fontWeight: FontWeight.bold)),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const CreatePostScreen(),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchCreatorStats,
        child: ListView(
          padding: AppSpacing.pAllMD,
          children: [
            _buildAnalyticsCard(isDark),
            AppSpacing.gapLG,
            const Text('Creator Activity',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            AppSpacing.gapSM,
            _buildEmptyActivity(isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalyticsCard(bool isDark) {
    return Container(
      padding: AppSpacing.pAllMD,
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBorder.withOpacity(0.2)
            : AppColors.lightBorder.withOpacity(0.2),
        borderRadius: AppRadius.rMD,
        border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'This Month\'s Reach',
                style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMuted
                        : AppColors.lightTextMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.w500),
              ),
              const Icon(Icons.insights_rounded, size: 18),
            ],
          ),
          AppSpacing.gapXS,
          _isLoadingCreatorStats
              ? const SkeletonLoader(width: 120, height: 34)
              : Text('Rs ${_creatorBalance.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontSize: 28, fontWeight: FontWeight.w900)),
          AppSpacing.gapMD,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMiniMetric('$_creatorViews', 'Posts', isDark),
              _buildMiniMetric('$_creatorSubscribers', 'Subscribers', isDark),
              _buildMiniMetric('$_creatorLikes', 'Likes', isDark),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniMetric(String value, String label, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        AppSpacing.gapXXS,
        Text(label,
            style: TextStyle(
                color:
                    isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                fontSize: 11)),
      ],
    );
  }

  Widget _buildEmptyActivity(bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: AppSpacing.pAllSM,
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBorder.withOpacity(0.15)
            : AppColors.lightBackground,
        borderRadius: AppRadius.rSM,
        border: Border.all(
            color: isDark
                ? AppColors.darkBorder.withOpacity(0.5)
                : AppColors.lightBorder.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.bolt_rounded),
          AppSpacing.gapSM,
          Expanded(
            child: Text(
              'Real activity will appear after followers interact with your posts.',
              style: TextStyle(
                  color: isDark
                      ? AppColors.darkTextMuted
                      : AppColors.lightTextMuted,
                  fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonFeed() {
    return ListView.builder(
      itemCount: 5,
      padding: EdgeInsets.zero,
      itemBuilder: (context, index) {
        if (index == 0) {
          return const Column(
            children: [
              SizedBox(height: 96, child: StoriesBar()),
              Divider(height: 1),
            ],
          );
        }
        return const _FeedCardSkeleton();
      },
    );
  }
}

class _FeedCardSkeleton extends StatelessWidget {
  const _FeedCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                SkeletonLoader(
                    width: 36, height: 36, borderRadius: AppRadius.rFull),
                AppSpacing.gapSM,
                SkeletonLoader(width: 120, height: 14),
              ],
            ),
          ),
          AspectRatio(
            aspectRatio: 1.1,
            child: SkeletonLoader(borderRadius: BorderRadius.zero),
          ),
          Padding(
            padding: EdgeInsets.all(AppSpacing.md),
            child: SkeletonLoader(width: 220, height: 14),
          ),
        ],
      ),
    );
  }
}
