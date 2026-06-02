import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/state/demo_app_state.dart';
import 'package:feebic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:feebic_mobile/features/shared/widgets/verified_badge.dart';
import '../widgets/chat_bubble.dart';

class ChatDetailsScreen extends StatefulWidget {
  final String username;
  final String avatarUrl;

  const ChatDetailsScreen({
    super.key,
    required this.username,
    required this.avatarUrl,
  });

  @override
  State<ChatDetailsScreen> createState() => _ChatDetailsScreenState();
}

class _ChatDetailsScreenState extends State<ChatDetailsScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, dynamic>> _messages = [
    {
      'text': 'Thank you for subscribing! ',
      'time': '1:12 PM',
      'isMe': false,
      'isPpv': false,
    },
    {
      'text':
          'Hey! I would love to see some behind the scenes content of your workouts.',
      'time': '1:30 PM',
      'isMe': true,
      'isPpv': false,
    },
    {
      'text': 'Check out this exclusive custom video I made for you! ',
      'time': '1:45 PM',
      'isMe': false,
      'isPpv': true,
      'ppvImageUrl':
          'https://images.unsplash.com/photo-1518770660439-4636190af475',
      'ppvPrice': 'Rs 1,299',
    },
  ];

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({
        'text': text,
        'time': 'Just now',
        'isMe': true,
        'isPpv': false,
      });
    });

    _textController.clear();

    // Scroll to the bottom of the list after the new message compiles
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _attachImageMessage() {
    setState(() {
      _messages.add({
        'text': 'Image attachment sent.',
        'time': 'Just now',
        'isMe': true,
        'isPpv': false,
      });
    });
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Image attached to chat.')));
  }

  void _createPaidMessage() {
    setState(() {
      _messages.add({
        'text': 'Premium media offer created. Unlock price: Rs 699',
        'time': 'Just now',
        'isMe': true,
        'isPpv': true,
        'ppvImageUrl':
            'https://images.unsplash.com/photo-1518611012118-696072aa579a',
        'ppvPrice': 'Rs 699',
      });
    });
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Paid message added.')));
  }

  void _showChatInfo(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: AppSpacing.pAllMD,
          children: [
            Row(
              children: [
                UserAvatar(imageUrl: widget.avatarUrl, radius: 24),
                AppSpacing.gapSM,
                Expanded(
                  child: Text(widget.username,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ],
            ),
            AppSpacing.gapMD,
            ListTile(
              leading: const Icon(Icons.notifications_active_outlined),
              title: const Text('Mute notifications'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Notifications muted for this chat.')));
              },
            ),
            ListTile(
              leading: const Icon(Icons.attach_money_rounded),
              title: const Text('Send tip'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Tip sheet opened.')));
              },
            ),
            ListTile(
              leading: Icon(Icons.block_rounded,
                  color: isDark ? AppColors.darkAccent : AppColors.lightAccent),
              title: const Text('Block user'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('User blocked.')));
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showUnlockConfirmationDialog(BuildContext context, int index) {
    final msg = _messages[index];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        title: const Text('Unlock Media Message',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Text(
          'Confirm payment of ${msg["ppvPrice"]} to unlock this private video message from @${widget.username}?',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel',
                style: TextStyle(color: AppColors.lightTextMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              final priceStr = msg['ppvPrice'] as String? ?? '0';
              final cleanPriceStr = priceStr.replaceAll(RegExp(r'[^0-9.]'), '');
              final price = double.tryParse(cleanPriceStr) ?? 0.0;

              final appState = DemoAppState.instance;
              if (appState.fanBalance < price) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Insufficient wallet funds'),
                    backgroundColor: AppColors.lightAccent,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                return;
              }

              final success = appState.unlockPpvMessage(
                '${widget.username}_msg_$index',
                price,
                widget.username,
              );

              if (success) {
                setState(() {
                  _messages[index]['isPpv'] = false; // Unlock PPV media
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Media message unlocked! '),
                    backgroundColor: AppColors.lightSuccess,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Insufficient wallet funds'),
                    backgroundColor: AppColors.lightAccent,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text('Unlock',
                style: TextStyle(
                    color: AppColors.lightPrimary,
                    fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final chatBackground =
        isDark ? const Color(0xFF0F1420) : const Color(0xFFF8FAFC);

    return Scaffold(
      backgroundColor: chatBackground,
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.white,
        elevation: 0.5,
        title: Row(
          children: [
            UserAvatar(imageUrl: widget.avatarUrl, radius: 16),
            AppSpacing.gapSM,
            Flexible(
              child: Text(
                widget.username,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ),
            const VerifiedBadge(size: 15),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_outlined, size: 20),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Calling ${widget.username}...')),
            ),
            color: isDark ? AppColors.darkTextMain : AppColors.lightTextMain,
          ),
          IconButton(
            icon: const Icon(Icons.info_outline, size: 20),
            onPressed: () => _showChatInfo(context, isDark),
            color: isDark ? AppColors.darkTextMain : AppColors.lightTextMain,
          ),
        ],
      ),
      body: Column(
        children: [
          // Chat list
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: AppSpacing.pAllMD,
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isLocked = msg['isPpv'] == true &&
                    !DemoAppState.instance.unlockedMessageIds
                        .contains('${widget.username}_msg_$index');
                return ChatBubble(
                  text: msg['text'] as String,
                  time: msg['time'] as String,
                  isMe: msg['isMe'] as bool,
                  isPpv: isLocked,
                  ppvImageUrl: isLocked
                      ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=50&auto=format&fit=crop&q=10'
                      : msg['ppvImageUrl'] as String?,
                  ppvPrice: msg['ppvPrice'] as String?,
                  onPpvUnlockPressed: () =>
                      _showUnlockConfirmationDialog(context, index),
                );
              },
            ),
          ),

          // Floating Input Dock
          _buildMessageInput(context, isDark),
        ],
      ),
    );
  }

  Widget _buildMessageInput(BuildContext context, bool isDark) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkBackground : AppColors.white,
            borderRadius: AppRadius.rLG,
            border: Border.all(
              color: isDark
                  ? AppColors.darkBorder
                  : AppColors.lightBorder.withOpacity(0.5),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.15 : 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.image_outlined,
                  color: isDark
                      ? AppColors.darkTextMuted
                      : AppColors.lightTextMuted,
                  size: 22,
                ),
                onPressed: _attachImageMessage,
              ),
              IconButton(
                icon: const Icon(
                  Icons.lock_outline_rounded,
                  color: AppColors.lightAccent,
                  size: 22,
                ),
                onPressed: _createPaidMessage,
              ),
              AppSpacing.gapSM,
              Expanded(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkBorder
                        : AppColors.lightBorder.withOpacity(0.2),
                    borderRadius: AppRadius.rMD,
                  ),
                  child: TextField(
                    controller: _textController,
                    onSubmitted: (_) => _sendMessage(),
                    style: TextStyle(
                      color: isDark
                          ? AppColors.darkTextMain
                          : AppColors.lightTextMain,
                      fontSize: 13,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      hintStyle: TextStyle(
                        color: isDark
                            ? AppColors.darkTextMuted
                            : AppColors.lightTextMuted,
                        fontSize: 13,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
              ),
              AppSpacing.gapSM,
              IconButton(
                icon: const Icon(Icons.send_rounded,
                    color: AppColors.lightPrimary, size: 22),
                onPressed: _sendMessage,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
