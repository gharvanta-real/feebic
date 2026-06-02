import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../chat/presentation/screens/chat_list_screen.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../widgets/feed_card.dart';
import '../widgets/stories_bar.dart';
import 'create_post_screen.dart';

class FeedScreen extends StatelessWidget {
  const FeedScreen({super.key});

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
            icon: AnimatedBuilder(
              animation: DemoAppState.instance,
              builder: (context, child) => Badge(
                isLabelVisible: DemoAppState.instance.notificationsCount > 0,
                label: Text('${DemoAppState.instance.notificationsCount}'),
                child: child,
              ),
              child: const Icon(Icons.favorite_border_rounded, size: 22),
            ),
            onPressed: () {
              DemoAppState.instance.markNotificationsSeen();
              _showActivitySheet(context);
            },
          ),
          IconButton(
            icon: AnimatedBuilder(
              animation: DemoAppState.instance,
              builder: (context, child) => Badge(
                isLabelVisible: DemoAppState.instance.unreadChats > 0,
                label: Text('${DemoAppState.instance.unreadChats}'),
                child: child,
              ),
              child: const Icon(Icons.send_rounded, size: 20),
            ),
            onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const ChatListScreen())),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async =>
            Future<void>.delayed(const Duration(milliseconds: 600)),
        child: AnimatedBuilder(
          animation: DemoAppState.instance,
          builder: (context, _) {
            final posts = DemoAppState.instance.posts;
            return ListView.builder(
              itemCount: posts.length + 1,
              itemBuilder: (context, index) {
                if (index == 0) {
                  return const Column(
                    children: [
                      StoriesBar(),
                      Divider(height: 1),
                    ],
                  );
                }
                final post = posts[index - 1];
                return FeedCard(
                  postId: post.postId,
                  username: post.username,
                  avatarUrl: post.avatarUrl,
                  isVerified: post.isVerified,
                  caption: post.caption,
                  imageUrl: post.imageUrl,
                  videoUrl: post.videoUrl,
                  isLocked: post.isLocked,
                  unlockPrice: post.unlockPrice,
                  isVideo: post.isVideo,
                  likes: post.likes,
                  comments: post.comments,
                  onLikePressed: () {},
                  onCommentPressed: () {},
                  onUnlockPressed: () {},
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildCreatorFeed(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
        onRefresh: () async =>
            Future<void>.delayed(const Duration(milliseconds: 600)),
        child: ListView(
          padding: AppSpacing.pAllMD,
          children: [
            AnimatedBuilder(
              animation: DemoAppState.instance,
              builder: (context, _) => _buildAnalyticsCard(isDark),
            ),
            AppSpacing.gapLG,
            const Text('Recent Activity',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            AppSpacing.gapSM,
            _buildActivityItem(
              username: 'mark_daniels',
              avatarUrl:
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
              action: 'liked your public post',
              time: '2m ago',
              isDark: isDark,
            ),
            _buildActivityItem(
              username: 'sarah_jones',
              avatarUrl:
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
              action: 'unlocked your Premium Travel Post for Rs 799',
              time: '12m ago',
              isEarning: true,
              isDark: isDark,
            ),
            _buildActivityItem(
              username: 'alex_green',
              avatarUrl:
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
              action: 'subscribed to your profile (Tier 1)',
              time: '1h ago',
              isEarning: true,
              isDark: isDark,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalyticsCard(bool isDark) {
    final state = DemoAppState.instance;
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
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xs, vertical: AppSpacing.xxs),
                decoration: BoxDecoration(
                    color:
                        isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                    borderRadius: AppRadius.rXS),
                child: const Text('+12.8%',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          AppSpacing.gapXS,
          Text('Rs ${state.creatorEarnings.toStringAsFixed(2)}',
              style:
                  const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
          AppSpacing.gapMD,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMiniMetric('14.2K', 'Views', isDark),
              _buildMiniMetric('340', 'Subscribers', isDark),
              _buildMiniMetric('${180 + state.savedCount}', 'Likes', isDark),
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

  Widget _buildActivityItem({
    required String username,
    required String avatarUrl,
    required String action,
    required String time,
    bool isEarning = false,
    required bool isDark,
  }) {
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
          UserAvatar(imageUrl: avatarUrl, radius: 18),
          AppSpacing.gapSM,
          Expanded(
            child: RichText(
              text: TextSpan(
                style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMain
                        : AppColors.lightTextMain,
                    fontSize: 13,
                    fontFamily: 'Inter'),
                children: [
                  TextSpan(
                      text: '$username ',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  TextSpan(
                    text: action,
                    style: TextStyle(
                      color: isEarning
                          ? (isDark
                              ? AppColors.darkSuccess
                              : AppColors.lightSuccess)
                          : (isDark
                              ? AppColors.darkTextMain
                              : AppColors.lightTextMain),
                      fontWeight:
                          isEarning ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AppSpacing.gapSM,
          Text(time,
              style: TextStyle(
                  color: isDark
                      ? AppColors.darkTextMuted
                      : AppColors.lightTextMuted,
                  fontSize: 11)),
        ],
      ),
    );
  }

  void _showActivitySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: AppSpacing.pAllMD,
          children: const [
            Text('Activity',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            AppSpacing.gapSM,
            ListTile(
                leading: Icon(Icons.favorite_rounded),
                title: Text('alexandra_art liked your reply'),
                subtitle: Text('2m ago')),
            ListTile(
                leading: Icon(Icons.lock_open_rounded),
                title: Text('premium_clicks posted new unlockable media'),
                subtitle: Text('15m ago')),
            ListTile(
                leading: Icon(Icons.person_add_alt_1_rounded),
                title: Text('lucia_fit opened a new subscriber tier'),
                subtitle: Text('1h ago')),
          ],
        ),
      ),
    );
  }
}
