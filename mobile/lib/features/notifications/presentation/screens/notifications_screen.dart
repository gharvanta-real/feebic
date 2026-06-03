import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/user_avatar.dart';
import '../../../shared/widgets/verified_badge.dart';

class NotificationItem {
  final String id;
  final String username;
  final String name;
  final String avatarUrl;
  final String actionText;
  final String? detailText;
  final String timeAgo;
  final String? attachmentUrl;
  final String type; // 'like', 'comment', 'subscribe', 'tip', 'unlock', 'post', 'alert'
  final double? amount;
  final String timeCategory; // 'Today', 'Yesterday', 'Last 7 Days', 'Earlier'
  final bool isVerified;
  bool isRead;
  bool isFollowing;

  NotificationItem({
    required this.id,
    required this.username,
    required this.name,
    required this.avatarUrl,
    required this.actionText,
    this.detailText,
    required this.timeAgo,
    this.attachmentUrl,
    required this.type,
    this.amount,
    required this.timeCategory,
    this.isVerified = false,
    this.isRead = false,
    this.isFollowing = false,
  });
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _activeTab = 'All';
  
  final List<String> _tabs = ['All', 'Subscribes', 'Likes', 'Comments', 'Tips & Unlocks'];

  final List<NotificationItem> _notifications = [
    // --- TODAY ---
    NotificationItem(
      id: 'notif_1',
      username: 'mpgold786',
      name: 'MPGold 786',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      actionText: 'posted a thread that you might like:',
      detailText: '"A high-fidelity, professional portrait of a creator..."',
      timeAgo: '4h ago',
      attachmentUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      type: 'post',
      timeCategory: 'Today',
      isVerified: true,
    ),
    NotificationItem(
      id: 'notif_2',
      username: 'karanrajput.hindu',
      name: 'Karan Rajput',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      actionText: 'and 190 others liked your comment:',
      detailText: 'For any dangerous gases in the room, ventilation is key.',
      timeAgo: '3h ago',
      attachmentUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      type: 'like',
      timeCategory: 'Today',
      isRead: true,
    ),
    
    // --- YESTERDAY ---
    NotificationItem(
      id: 'notif_3',
      username: 'sarah_jenkins',
      name: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      actionText: 'tipped you',
      amount: 500.0,
      detailText: 'Loved your last workout video! Keep it up ❤️',
      timeAgo: '1d ago',
      type: 'tip',
      timeCategory: 'Yesterday',
      isFollowing: true,
    ),
    NotificationItem(
      id: 'notif_4',
      username: 'alex_green',
      name: 'Alex Green',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      actionText: 'subscribed to your profile (Base Tier)',
      timeAgo: '1d ago',
      type: 'subscribe',
      timeCategory: 'Yesterday',
      isFollowing: false,
    ),
    
    // --- LAST 7 DAYS ---
    NotificationItem(
      id: 'notif_5',
      username: 'security_alert',
      name: 'Security Alert',
      avatarUrl: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa',
      actionText: 'An unrecognized Windows PC just logged in near Ghaziabad, India, IN',
      timeAgo: '2d ago',
      attachmentUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b',
      type: 'alert',
      timeCategory: 'Last 7 Days',
      isRead: true,
    ),
    NotificationItem(
      id: 'notif_6',
      username: 'grityhub',
      name: 'Grity Hub',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61',
      actionText: 'replied to your comment on grityhub\'s post:',
      detailText: '@ansh_bhati_6999 it\'s scheduled for tomorrow morning.',
      timeAgo: '2d ago',
      attachmentUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      type: 'comment',
      timeCategory: 'Last 7 Days',
      isVerified: true,
    ),
    NotificationItem(
      id: 'notif_7',
      username: 'demi_rose',
      name: 'Demi Rose',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      actionText: 'unlocked your Premium Media Post',
      amount: 1299.0,
      timeAgo: '4d ago',
      attachmentUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      type: 'unlock',
      timeCategory: 'Last 7 Days',
      isRead: true,
    ),
    
    // --- EARLIER ---
    NotificationItem(
      id: 'notif_8',
      username: 'lana_rhoades',
      name: 'Lana Rhoades',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
      actionText: 'liked your post: "Dreaming under the stars..."',
      timeAgo: '1w ago',
      attachmentUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      type: 'like',
      timeCategory: 'Earlier',
      isRead: true,
      isVerified: true,
    ),
  ];

  List<NotificationItem> _getFilteredNotifications() {
    if (_activeTab == 'All') {
      return _notifications;
    }
    
    return _notifications.where((n) {
      switch (_activeTab) {
        case 'Subscribes':
          return n.type == 'subscribe';
        case 'Likes':
          return n.type == 'like';
        case 'Comments':
          return n.type == 'comment';
        case 'Tips & Unlocks':
          return n.type == 'tip' || n.type == 'unlock';
        default:
          return true;
      }
    }).toList();
  }

  void _clearAllNotifications() {
    setState(() {
      _notifications.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Notifications cleared successfully.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filteredList = _getFilteredNotifications();
    
    // Group notifications by timeCategory
    final Map<String, List<NotificationItem>> groupedNotifications = {};
    for (var n in filteredList) {
      groupedNotifications.putIfAbsent(n.timeCategory, () => []).add(n);
    }
    
    // Desired order of categories
    final List<String> categoriesOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Earlier'];

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        centerTitle: true,
        actions: [
          if (_notifications.isNotEmpty)
            TextButton(
              onPressed: _clearAllNotifications,
              child: Text(
                'Clear all',
                style: TextStyle(
                  color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48.0),
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  width: 0.5,
                ),
              ),
            ),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 8),
              itemCount: _tabs.length,
              itemBuilder: (context, index) {
                final tab = _tabs[index];
                final isActive = _activeTab == tab;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _activeTab = tab;
                      });
                    },
                    borderRadius: AppRadius.rLG,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isActive 
                            ? (isDark ? AppColors.darkPrimary : AppColors.lightPrimary)
                            : Colors.transparent,
                        borderRadius: AppRadius.rLG,
                        border: Border.all(
                          color: isActive
                              ? Colors.transparent
                              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        tab,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isActive
                              ? Colors.white
                              : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
      body: _notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_off_outlined,
                    size: 48,
                    color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                  ),
                  AppSpacing.gapSM,
                  const Text(
                    'No notifications yet',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  AppSpacing.gapXXS,
                  Text(
                    'We will notify you when something happens.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                ],
              ),
            )
          : filteredList.isEmpty
              ? Center(
                  child: Text(
                    'No alerts in this category',
                    style: TextStyle(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                )
              : ListView.builder(
                  itemCount: categoriesOrder.length,
                  itemBuilder: (context, catIdx) {
                    final category = categoriesOrder[catIdx];
                    final list = groupedNotifications[category];
                    if (list == null || list.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(
                            left: AppSpacing.md,
                            right: AppSpacing.md,
                            top: AppSpacing.md,
                            bottom: AppSpacing.xs,
                          ),
                          child: Text(
                            category,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: list.length,
                          separatorBuilder: (context, index) => Divider(
                            height: 1,
                            thickness: 0.5,
                            indent: 64,
                            color: isDark 
                                ? AppColors.darkBorder.withOpacity(0.4) 
                                : AppColors.lightBorder.withOpacity(0.4),
                          ),
                          itemBuilder: (context, itemIdx) {
                            final item = list[itemIdx];
                            return _buildNotificationRow(context, item, isDark);
                          },
                        ),
                      ],
                    );
                  },
                ),
    );
  }

  Widget _buildNotificationRow(BuildContext context, NotificationItem item, bool isDark) {
    return Container(
      color: item.isRead 
          ? Colors.transparent 
          : (isDark 
              ? AppColors.darkPrimary.withOpacity(0.05) 
              : AppColors.lightPrimary.withOpacity(0.04)),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Avatar
          GestureDetector(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Opened profile of @${item.username}')),
              );
            },
            child: UserAvatar(
              imageUrl: item.avatarUrl,
              radius: 20,
            ),
          ),
          AppSpacing.gapSM,
          
          // Details content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RichText(
                  text: TextSpan(
                    style: TextStyle(
                      fontSize: 13,
                      fontFamily: 'Inter',
                      height: 1.35,
                      color: isDark ? AppColors.darkTextMain : AppColors.lightTextMain,
                    ),
                    children: [
                      TextSpan(
                        text: item.username,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      if (item.isVerified) const TextSpan(text: ' '),
                      if (item.isVerified)
                        const WidgetSpan(
                          alignment: PlaceholderAlignment.middle,
                          child: Padding(
                            padding: EdgeInsets.only(right: 2.0),
                            child: VerifiedBadge(size: 13),
                          ),
                        ),
                      TextSpan(text: ' ${item.actionText}'),
                      if (item.amount != null)
                        TextSpan(
                          text: ' ₹${item.amount!.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: AppColors.lightSuccess,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                    ],
                  ),
                ),
                if (item.detailText != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    item.detailText!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  item.timeAgo,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                  ),
                ),
              ],
            ),
          ),
          AppSpacing.gapSM,
          
          // Action button / Image preview on the right
          _buildRightAction(context, item, isDark),
        ],
      ),
    );
  }

  Widget _buildRightAction(BuildContext context, NotificationItem item, bool isDark) {
    if (item.type == 'subscribe') {
      return SizedBox(
        height: 28,
        child: ElevatedButton(
          onPressed: () {
            setState(() {
              item.isFollowing = !item.isFollowing;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  item.isFollowing 
                      ? 'Subscribed to @${item.username}' 
                      : 'Unsubscribed from @${item.username}',
                ),
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: item.isFollowing
                ? Colors.transparent
                : (isDark ? AppColors.darkPrimary : AppColors.lightPrimary),
            foregroundColor: item.isFollowing
                ? (isDark ? AppColors.darkTextMain : AppColors.lightTextMain)
                : Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            shape: RoundedRectangleBorder(
              borderRadius: AppRadius.rLG,
              side: item.isFollowing
                  ? BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder, width: 1)
                  : BorderSide.none,
            ),
          ),
          child: Text(
            item.isFollowing ? 'Subscribed' : 'Subscribe',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    if (item.attachmentUrl != null) {
      return GestureDetector(
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Opened attachment link for ${item.username}\'s post')),
          );
        },
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: AppRadius.rXS,
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              width: 0.5,
            ),
            image: DecorationImage(
              image: NetworkImage(item.attachmentUrl!),
              fit: BoxFit.cover,
            ),
          ),
        ),
      );
    }

    // Default placeholder action icon
    return InkWell(
      onTap: () {
        setState(() {
          item.isRead = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notification marked as read.')),
        );
      },
      borderRadius: BorderRadius.circular(100),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: item.isRead 
              ? Colors.transparent 
              : (isDark ? AppColors.darkBorder : AppColors.lightBorder.withOpacity(0.5)),
        ),
        child: Icon(
          item.isRead ? Icons.done_all_rounded : Icons.mark_as_unread_rounded,
          size: 16,
          color: item.isRead 
              ? (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)
              : (isDark ? AppColors.darkPrimary : AppColors.lightPrimary),
        ),
      ),
    );
  }
}
