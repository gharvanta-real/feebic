import 'package:flutter/material.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import 'package:feebic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:feebic_mobile/features/shared/widgets/verified_badge.dart';
import 'chat_details_screen.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  final List<Map<String, dynamic>> _chats = <Map<String, dynamic>>[
    {
      'name': 'Alexandra Art',
      'avatar': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      'lastMsg': 'Thank you for subscribing. Let me know...',
      'time': '2m ago',
      'unread': 1,
      'isOnline': true,
      'isVerified': true,
    },
    {
      'name': 'Chef Gabriel',
      'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      'lastMsg': 'Did you try cooking that sourdough recipe?',
      'time': '1h ago',
      'unread': 0,
      'isOnline': false,
      'isVerified': true,
    },
    {
      'name': 'Sam Fitness',
      'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      'lastMsg': 'New workout session coming up tomorrow.',
      'time': 'Yesterday',
      'unread': 0,
      'isOnline': true,
      'isVerified': false,
    },
  ];

  void _composeMessage() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Message'),
        content: TextField(
            controller: controller,
            decoration:
                const InputDecoration(hintText: 'Creator handle or name')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              final name = controller.text.trim();
              if (name.isEmpty) return;
              Navigator.pop(context);
              setState(() {
                _chats.insert(0, {
                  'name': name,
                  'avatar':
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
                  'lastMsg': 'Conversation started',
                  'time': 'Now',
                  'unread': 0,
                  'isOnline': true,
                  'isVerified': false,
                });
              });
            },
            child: const Text('Start'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chats',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
              icon: const Icon(Icons.edit_note_rounded, size: 26),
              onPressed: _composeMessage),
        ],
      ),
      body: ListView.separated(
        itemCount: _chats.length,
        separatorBuilder: (context, index) =>
            const Divider(height: 1, indent: 72),
        itemBuilder: (context, index) {
          final chat = _chats[index];
          final hasUnread = (chat['unread'] as int) > 0;

          return Dismissible(
            key: ValueKey('${chat['name']}_$index'),
            direction: DismissDirection.endToStart,
            background: Container(
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: AppSpacing.md),
              color: isDark ? AppColors.darkAccent : AppColors.lightAccent,
              child: const Icon(Icons.archive_rounded, color: Colors.white),
            ),
            onDismissed: (_) {
              setState(() => _chats.removeAt(index));
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Chat archived.')));
            },
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md, vertical: AppSpacing.xs - 2),
              leading: UserAvatar(
                imageUrl: chat['avatar'] as String,
                radius: 24,
                isOnline: chat['isOnline'] as bool,
              ),
              title: Row(
                children: [
                  Flexible(
                    child: Text(
                      chat['name'] as String,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontWeight:
                              hasUnread ? FontWeight.bold : FontWeight.w600,
                          fontSize: 14),
                    ),
                  ),
                  if (chat['isVerified'] == true) const VerifiedBadge(),
                  const Spacer(),
                  Text(
                    chat['time'] as String,
                    style: TextStyle(
                      color: hasUnread
                          ? (isDark
                              ? AppColors.darkPrimary
                              : AppColors.lightPrimary)
                          : (isDark
                              ? AppColors.darkTextMuted
                              : AppColors.lightTextMuted),
                      fontSize: 11,
                      fontWeight:
                          hasUnread ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ],
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        chat['lastMsg'] as String,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: hasUnread
                              ? (isDark
                                  ? AppColors.darkTextMain
                                  : AppColors.lightTextMain)
                              : (isDark
                                  ? AppColors.darkTextMuted
                                  : AppColors.lightTextMuted),
                          fontWeight:
                              hasUnread ? FontWeight.bold : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    if (hasUnread) ...[
                      AppSpacing.gapSM,
                      CircleAvatar(
                        radius: 8,
                        backgroundColor: isDark
                            ? AppColors.darkPrimary
                            : AppColors.lightPrimary,
                        child: Text('${chat['unread']}',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
              ),
              onTap: () {
                setState(() => chat['unread'] = 0);
                DemoAppState.instance.markChatsRead();
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ChatDetailsScreen(
                      username: chat['name'] as String,
                      avatarUrl: chat['avatar'] as String,
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
