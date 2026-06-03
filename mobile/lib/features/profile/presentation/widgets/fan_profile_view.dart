import 'package:flutter/material.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/post_model.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../screens/settings_screen.dart';
import '../screens/visitor_hub_screen.dart';
import '../screens/wallet_payments_screen.dart';
import 'package:felbic_mobile/features/shared/widgets/user_avatar.dart';
import 'perspective_toggle.dart';

class FanProfileView extends StatefulWidget {
  const FanProfileView({super.key});

  @override
  State<FanProfileView> createState() => _FanProfileViewState();
}

class _FanProfileViewState extends State<FanProfileView> {
  bool _showSavedTab = false;

  // Wallet data from API
  double _balance = 0.0;
  int _unlockedCount = 0;
  bool _isLoadingWallet = true;

  // Saved/bookmarked posts from API
  List<PostModel> _savedPosts = [];
  bool _isLoadingSaved = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    await Future.wait([_loadWallet(), _loadSavedPosts()]);
  }

  Future<void> _loadWallet() async {
    setState(() => _isLoadingWallet = true);
    try {
      final response = await getIt<ApiClient>().get('/wallet');
      final data = Map<String, dynamic>.from(response.data as Map);
      if (!mounted) return;
      setState(() {
        _balance = ((data['balance'] ?? 0) as num).toDouble();
        final txns = data['transactions'] is List
            ? (data['transactions'] as List)
            : <dynamic>[];
        // Count unlock transactions
        _unlockedCount = txns
            .whereType<Map>()
            .where((t) =>
                (t['type']?.toString() ?? '') == 'unlock' ||
                (t['title']?.toString() ?? '').toLowerCase().contains('unlock'))
            .length;
        _isLoadingWallet = false;
      });
    } catch (e) {
      debugPrint('FanProfileView: wallet load error: $e');
      if (mounted) setState(() => _isLoadingWallet = false);
    }
  }

  Future<void> _loadSavedPosts() async {
    setState(() => _isLoadingSaved = true);
    try {
      final response = await getIt<ApiClient>().get('/posts/bookmarks');
      final List<dynamic> raw = response.data is List
          ? response.data as List
          : (response.data['posts'] ?? []) as List;
      final posts = raw
          .whereType<Map>()
          .map((e) => PostModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      if (!mounted) return;
      setState(() {
        _savedPosts = posts;
        _isLoadingSaved = false;
      });
    } catch (e) {
      debugPrint('FanProfileView: saved posts load error: $e');
      if (mounted) setState(() => _isLoadingSaved = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return AnimatedBuilder(
      animation: Listenable.merge([
        DemoAppState.instance,
        getIt<AuthSession>(),
      ]),
      builder: (context, _) {
        final state = DemoAppState.instance;
        final auth = getIt<AuthSession>();
        final user = auth.user ?? {};
        final username = user['username']?.toString() ?? state.fanUsername;
        final name = user['display_name']?.toString() ?? state.fanName;
        final bio = user['bio']?.toString() ?? state.fanBio;
        final avatar = ApiClient.resolveUrl(
            user['avatar']?.toString() ?? state.fanAvatar);
        final website = user['website']?.toString() ?? 'felbic.me/$username';

        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                const Icon(Icons.account_circle_rounded, size: 22),
                AppSpacing.gapXS,
                Flexible(
                  child: Text(username,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ),
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
                            const SettingsScreen(isCreatorMode: false))),
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: _loadData,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Row(
                    children: [
                      UserAvatar(imageUrl: avatar, radius: 36),
                      Expanded(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _buildStatColumn(
                              _isLoadingWallet
                                  ? '...'
                                  : '${state.subscribedCreators.length}',
                              'Subscribed',
                              isDark,
                            ),
                            _buildStatColumn(
                              _isLoadingWallet
                                  ? '...'
                                  : '$_unlockedCount',
                              'Unlocked',
                              isDark,
                            ),
                            _buildStatColumn(
                              _isLoadingWallet
                                  ? '...'
                                  : 'Rs ${_balance.toStringAsFixed(0)}',
                              'Balance',
                              isDark,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: theme.textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.bold, fontSize: 14)),
                      AppSpacing.gapXXS,
                      Text(bio,
                          style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? AppColors.darkTextMain
                                  : AppColors.lightTextMain,
                              height: 1.3)),
                      AppSpacing.gapXS,
                      Text(website,
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: primaryColor)),
                    ],
                  ),
                ),
                AppSpacing.gapMD,
                _buildActions(context),
                AppSpacing.gapLG,
                const Divider(height: 1),
                _buildTabs(isDark, primaryColor),
                AppSpacing.gapMD,
                _showSavedTab
                    ? _buildSavedPostsGrid(isDark)
                    : _buildUnlockedPlaceholder(isDark),
                const SizedBox(height: 30),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSavedPostsGrid(bool isDark) {
    if (_isLoadingSaved) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 60),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_savedPosts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.bookmark_rounded,
                  size: 40, color: isDark ? Colors.white24 : Colors.black26),
              AppSpacing.gapSM,
              Text(
                'no saved posts yet',
                style: TextStyle(
                  color: isDark
                      ? AppColors.darkTextMuted
                      : AppColors.lightTextMuted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      addAutomaticKeepAlives: false,
      addRepaintBoundaries: true,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 3,
        mainAxisSpacing: 3,
      ),
      itemCount: _savedPosts.length,
      itemBuilder: (context, index) {
        final post = _savedPosts[index];
        final imageUrl =
            post.mediaUrls.isNotEmpty ? post.mediaUrls.first : '';
        return AspectRatio(
          aspectRatio: 1,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (imageUrl.isNotEmpty)
                  Image.network(imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                            color: Colors.grey.withOpacity(0.2),
                          ))
                else
                  Container(color: Colors.grey.withOpacity(0.15)),
                if (post.mediaType == 'video')
                  const Positioned(
                    top: 4,
                    left: 4,
                    child: Icon(Icons.play_circle_fill_rounded,
                        color: Colors.white, size: 14),
                  ),
                Positioned(
                  bottom: 4,
                  right: 4,
                  child: Icon(Icons.bookmark_rounded,
                      color: primaryColor, size: 14),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildUnlockedPlaceholder(bool isDark) {
    // Show an empty state; unlocked media is tracked server-side via post_unlocks
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_open_rounded,
                size: 40, color: isDark ? Colors.white24 : Colors.black26),
            AppSpacing.gapSM,
            Text(
              'unlocked content',
              style: TextStyle(
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Browse feed and unlock premium posts',
              style: TextStyle(
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String count, String label, bool isDark) {
    return Column(
      children: [
        Text(count,
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color:
                    isDark ? AppColors.darkTextMain : AppColors.lightTextMain)),
        AppSpacing.gapXXS,
        Text(label,
            style: TextStyle(
                fontSize: 11,
                color: isDark
                    ? AppColors.darkTextMuted
                    : AppColors.lightTextMuted)),
      ],
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
                          builder: (_) => const VisitorHubScreen())),
                  child: const Text('Visitor Hub'))),
          AppSpacing.gapSM,
          Expanded(
              child: OutlinedButton(
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const WalletPaymentsScreen())),
                  child: const Text('Wallet Settings'))),
        ],
      ),
    );
  }

  Widget _buildTabs(bool isDark, Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        children: [
          _buildTabButton(false, Icons.lock_open_rounded, 'unlocked feed',
              isDark, primaryColor),
          _buildTabButton(true, Icons.bookmark_rounded, 'saved collection',
              isDark, primaryColor),
        ],
      ),
    );
  }

  Widget _buildTabButton(bool forSaved, IconData icon, String label,
      bool isDark, Color primaryColor) {
    final active = _showSavedTab == forSaved;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _showSavedTab = forSaved),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
              border: Border(
                  bottom: BorderSide(
                      color: active ? primaryColor : Colors.transparent,
                      width: 2.0))),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: active ? primaryColor : Colors.grey),
              const SizedBox(width: 6),
              Text(label,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: active
                          ? (isDark ? Colors.white : Colors.black)
                          : Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
