import 'package:flutter/material.dart';
import 'package:feebic_mobile/features/shared/widgets/verified_badge.dart';
import 'package:feebic_mobile/features/shared/widgets/user_avatar.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../screens/settings_screen.dart';
import '../screens/creator_hub_screen.dart';
import 'profile_stats.dart';
import 'perspective_toggle.dart';
import 'creator_post_grid.dart';
import 'creator_post_detail_sheet.dart';
import 'mock_profile_data.dart';

class CreatorProfileView extends StatefulWidget {
  const CreatorProfileView({super.key});

  @override
  State<CreatorProfileView> createState() => _CreatorProfileViewState();
}

class _CreatorProfileViewState extends State<CreatorProfileView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late List<Map<String, dynamic>> _publicPosts;
  late List<Map<String, dynamic>> _lockedPosts;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _publicPosts = List.from(initialPublicPosts);
    _lockedPosts = List.from(initialLockedPosts);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: DemoAppState.instance,
      builder: (context, _) {
        final state = DemoAppState.instance;
        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                const Icon(Icons.lock_person_rounded, size: 22),
                AppSpacing.gapXS,
                Text(state.creatorUsername,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16)),
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
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Row(
                  children: [
                    UserAvatar(
                        imageUrl: state.creatorAvatar,
                        radius: 36,
                        hasStory: true),
                    const Spacer(),
                    ProfileStats(
                      postsCount:
                          '${_publicPosts.length + _lockedPosts.length}',
                      followersCount: '4.8K',
                      subscribersCount: '190',
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(state.creatorName,
                        style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    AppSpacing.gapXXS,
                    Text(state.creatorCategory,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark
                                ? AppColors.darkTextMuted
                                : AppColors.lightTextMuted)),
                    AppSpacing.gapXXS,
                    Text(state.creatorBio,
                        style: TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            color: isDark
                                ? AppColors.darkTextMain
                                : AppColors.lightTextMain)),
                    AppSpacing.gapXS,
                    Text(state.creatorLink,
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isDark
                                ? AppColors.darkPrimary
                                : AppColors.lightPrimary)),
                  ],
                ),
              ),
              AppSpacing.gapMD,
              _buildActions(context),
              AppSpacing.gapLG,
              TabBar(
                controller: _tabController,
                indicatorColor:
                    isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                labelColor:
                    isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                unselectedLabelColor:
                    isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                tabs: const [
                  Tab(icon: Icon(Icons.grid_on_rounded, size: 20)),
                  Tab(icon: Icon(Icons.lock_person_rounded, size: 24))
                ],
              ),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    CreatorPostGrid(
                        posts: _publicPosts,
                        isLockedTab: false,
                        onTap: (p) => _openDetail(p)),
                    CreatorPostGrid(
                        posts: _lockedPosts,
                        isLockedTab: true,
                        onTap: (p) => _openDetail(p)),
                  ],
                ),
              ),
            ],
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
                  onPressed: () => _showActionSheet(context, 'Share Profile'),
                  child: const Text('Share Profile'))),
        ],
      ),
    );
  }

  void _openDetail(Map<String, dynamic> post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreatorPostDetailSheet(
          post: post, onStateChanged: () => setState(() {})),
    );
  }

  void _showActionSheet(BuildContext context, String action) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: AppSpacing.pAllMD,
          children: [
            Text(action,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            AppSpacing.gapSM,
            ListTile(
              leading: const Icon(Icons.person_outline_rounded),
              title: const Text('Profile details'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context)
                    .showSnackBar(SnackBar(content: Text('$action saved.')));
              },
            ),
          ],
        ),
      ),
    );
  }
}
