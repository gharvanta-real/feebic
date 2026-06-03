import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import 'package:felbic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:felbic_mobile/features/shared/widgets/verified_badge.dart';
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

  bool _isLoading = true;
  bool _isSending = false;
  bool _isBlocked = false;
  bool _isPpv = false;
  final double _ppvPrice = 699;
  String? _pendingMediaUrl;
  String? _pendingMediaType;

  List<Map<String, dynamic>> _messages = [];

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final response =
          await getIt<ApiClient>().get('/chat/messages/${widget.username}');
      final data = response.data is List ? response.data as List : <dynamic>[];
      if (!mounted) return;
      setState(() {
        _messages = data.whereType<Map>().map((item) {
          final msg = Map<String, dynamic>.from(item);
          msg['mediaUrl'] =
              ApiClient.resolveUrl((msg['mediaUrl'] ?? '').toString());
          return msg;
        }).toList();
      });
      _scrollToBottom();
    } catch (e) {
      debugPrint('error loading messages: $e');
      if (!mounted) return;
      setState(() {
        _messages = _fallbackMessages();
      });
      _scrollToBottom();
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> _fallbackMessages() {
    return [
      {
        'id': 'demo_1',
        'sender': widget.username,
        'text': 'thank you for subscribing',
        'time': '13:12',
        'mediaUrl': '',
        'mediaType': '',
        'isPPV': false,
        'price': 0,
        'isUnlocked': true,
      },
      {
        'id': 'demo_2',
        'sender': 'user',
        'text': 'hey, send me the behind the scenes clip',
        'time': '13:30',
        'mediaUrl': '',
        'mediaType': '',
        'isPPV': false,
        'price': 0,
        'isUnlocked': true,
      },
      {
        'id': 'demo_3',
        'sender': widget.username,
        'text': 'private media is ready',
        'time': '13:45',
        'mediaUrl':
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900',
        'mediaType': 'image',
        'isPPV': true,
        'price': 1299,
        'isUnlocked': false,
      },
    ];
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (_isSending ||
        _isBlocked ||
        (text.isEmpty && _pendingMediaUrl == null)) {
      return;
    }

    setState(() => _isSending = true);
    final localMessage = {
      'id': 'local_${DateTime.now().millisecondsSinceEpoch}',
      'sender': 'user',
      'text': text,
      'time': 'now',
      'mediaUrl': _pendingMediaUrl ?? '',
      'mediaType': _pendingMediaType ?? '',
      'isPPV': _isPpv,
      'price': _isPpv ? _ppvPrice : 0,
      'isUnlocked': true,
    };

    setState(() {
      _messages.add(localMessage);
      _textController.clear();
      _pendingMediaUrl = null;
      _pendingMediaType = null;
      _isPpv = false;
    });
    _scrollToBottom();

    try {
      await getIt<ApiClient>().post(
        '/chat/messages',
        data: {
          'receiver_username': widget.username,
          'message': text,
          'media_url': localMessage['mediaUrl'],
          'media_type': localMessage['mediaType'],
          'is_ppv': localMessage['isPPV'],
          'price': localMessage['price'],
        },
      );
      await _loadMessages();
    } catch (e) {
      debugPrint('error sending message: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('message saved locally, server is not reachable')),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _attachImageMessage() {
    setState(() {
      _pendingMediaUrl =
          'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900';
      _pendingMediaType = 'image';
    });
  }

  void _togglePpv() {
    setState(() => _isPpv = !_isPpv);
  }

  void _showChatInfo(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.topLG),
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
                  child: Text('@${widget.username}',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                const VerifiedBadge(size: 16),
              ],
            ),
            AppSpacing.gapMD,
            ListTile(
              leading: const Icon(Icons.notifications_active_outlined),
              title: const Text('mute notifications'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.payments_outlined),
              title: const Text('send tip'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('tip sheet opened')));
              },
            ),
            ListTile(
              leading: Icon(Icons.block_rounded,
                  color: isDark ? AppColors.darkAccent : AppColors.lightAccent),
              title: Text(_isBlocked ? 'unblock account' : 'block account'),
              onTap: () {
                Navigator.pop(context);
                setState(() => _isBlocked = !_isBlocked);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCallSheet(bool isVideo) {
    showDialog(
      context: context,
      builder: (context) => Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: AppSpacing.pAllMD,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(isVideo ? 'secure video call' : 'secure voice call',
                        style: const TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.bold)),
                    const Text('00:00',
                        style: TextStyle(
                            color: AppColors.lightPrimary,
                            fontFamily: 'monospace')),
                  ],
                ),
              ),
              Expanded(
                child: isVideo
                    ? Row(
                        children: [
                          Expanded(
                              child:
                                  _callPane(widget.avatarUrl, widget.username)),
                          Expanded(child: _callPane('', 'you')),
                        ],
                      )
                    : Center(
                        child: _callPane(widget.avatarUrl, widget.username,
                            compact: true)),
              ),
              Padding(
                padding: AppSpacing.pAllLG,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _roundCallButton(
                        Icons.mic_outlined, Colors.white12, Colors.white),
                    AppSpacing.gapMD,
                    _roundCallButton(
                        Icons.call_end_rounded, Colors.red, Colors.white,
                        onPressed: () => Navigator.pop(context), size: 60),
                    AppSpacing.gapMD,
                    _roundCallButton(
                      isVideo
                          ? Icons.videocam_outlined
                          : Icons.volume_up_outlined,
                      Colors.white12,
                      Colors.white,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _callPane(String avatar, String label, {bool compact = false}) {
    return Container(
      margin: compact ? EdgeInsets.zero : const EdgeInsets.all(1),
      color: const Color(0xFF111827),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            UserAvatar(imageUrl: avatar, radius: compact ? 52 : 42),
            AppSpacing.gapSM,
            Text(label,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _roundCallButton(
    IconData icon,
    Color background,
    Color foreground, {
    VoidCallback? onPressed,
    double size = 52,
  }) {
    return SizedBox(
      height: size,
      width: size,
      child: IconButton.filled(
        style: IconButton.styleFrom(
            backgroundColor: background, foregroundColor: foreground),
        onPressed: onPressed ?? () {},
        icon: Icon(icon),
      ),
    );
  }

  void _showUnlockConfirmationDialog(BuildContext context, int index) {
    final msg = _messages[index];
    final price = (msg['price'] as num?)?.toDouble() ?? 0;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        title: const Text('unlock media',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Text(
            'unlock this private message from @${widget.username} for rs ${price.toStringAsFixed(0)}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              final success = DemoAppState.instance.unlockPpvMessage(
                '${widget.username}_msg_$index',
                price,
                widget.username,
              );
              if (!success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('insufficient wallet funds')),
                );
                return;
              }
              setState(() => _messages[index]['isUnlocked'] = true);
            },
            child: const Text('unlock',
                style: TextStyle(fontWeight: FontWeight.bold)),
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
            onPressed: () => _showCallSheet(false),
          ),
          IconButton(
            icon: const Icon(Icons.videocam_outlined, size: 21),
            onPressed: () => _showCallSheet(true),
          ),
          IconButton(
            icon: const Icon(Icons.info_outline, size: 20),
            onPressed: () => _showChatInfo(context, isDark),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _loadMessages,
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.md,
                        AppSpacing.md,
                        AppSpacing.md,
                        AppSpacing.lg,
                      ),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final msg = _messages[index];
                        final isMe = (msg['sender'] ?? '') == 'user';
                        final isLocked = msg['isPPV'] == true &&
                            msg['isUnlocked'] != true &&
                            !DemoAppState.instance.unlockedMessageIds
                                .contains('${widget.username}_msg_$index');
                        return ChatBubble(
                          text: (msg['text'] ?? '').toString(),
                          time: (msg['time'] ?? '').toString(),
                          isMe: isMe,
                          isPpv: isLocked,
                          mediaUrl: (msg['mediaUrl'] ?? '').toString(),
                          mediaType: (msg['mediaType'] ?? '').toString(),
                          ppvImageUrl: isLocked
                              ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=10'
                              : (msg['mediaUrl'] ?? '').toString(),
                          ppvPrice:
                              'rs ${((msg['price'] as num?)?.toDouble() ?? 0).toStringAsFixed(0)}',
                          onPpvUnlockPressed: () =>
                              _showUnlockConfirmationDialog(context, index),
                        );
                      },
                    ),
                  ),
          ),
          _buildMessageInput(context, isDark),
        ],
      ),
    );
  }

  Widget _buildMessageInput(BuildContext context, bool isDark) {
    final mutedColor =
        isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.sm, AppSpacing.xs, AppSpacing.sm, AppSpacing.sm),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkBackground : AppColors.white,
          border: Border(
            top: BorderSide(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_pendingMediaUrl != null || _isPpv)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                padding: AppSpacing.pAllXS,
                decoration: BoxDecoration(
                  color:
                      isDark ? AppColors.darkBorder : const Color(0xFFF1F5F9),
                  borderRadius: AppRadius.rMD,
                ),
                child: Row(
                  children: [
                    Icon(
                        _pendingMediaUrl == null
                            ? Icons.lock_outline
                            : Icons.image_outlined,
                        color: _isPpv
                            ? AppColors.lightAccent
                            : AppColors.lightPrimary,
                        size: 18),
                    AppSpacing.gapXS,
                    Expanded(
                      child: Text(
                        _pendingMediaUrl != null
                            ? (_isPpv
                                ? 'image attached · locked for rs ${_ppvPrice.round()}'
                                : 'image attached')
                            : 'next message locked for rs ${_ppvPrice.round()}',
                        style: TextStyle(
                            color: mutedColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: () => setState(() {
                        _pendingMediaUrl = null;
                        _pendingMediaType = null;
                        _isPpv = false;
                      }),
                      icon: Icon(Icons.close_rounded,
                          color: mutedColor, size: 18),
                    ),
                  ],
                ),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  icon: Icon(Icons.add_photo_alternate_outlined,
                      color: mutedColor, size: 23),
                  onPressed: _isBlocked ? null : _attachImageMessage,
                ),
                IconButton(
                  icon: Icon(
                    _isPpv ? Icons.lock_rounded : Icons.lock_outline_rounded,
                    color: _isPpv ? AppColors.lightAccent : mutedColor,
                    size: 22,
                  ),
                  onPressed: _isBlocked ? null : _togglePpv,
                ),
                Expanded(
                  child: Container(
                    constraints:
                        const BoxConstraints(minHeight: 44, maxHeight: 118),
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.darkBorder
                          : const Color(0xFFF8FAFC),
                      borderRadius: AppRadius.rFull,
                      border: Border.all(
                        color: isDark
                            ? AppColors.darkBorderStrong
                            : AppColors.lightBorder,
                      ),
                    ),
                    child: TextField(
                      controller: _textController,
                      enabled: !_isBlocked,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.newline,
                      style: TextStyle(
                        color: isDark
                            ? AppColors.darkTextMain
                            : AppColors.lightTextMain,
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        hintText: _isBlocked
                            ? 'account blocked'
                            : 'message @${widget.username}...',
                        hintStyle: TextStyle(color: mutedColor, fontSize: 14),
                        border: InputBorder.none,
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 11),
                      ),
                    ),
                  ),
                ),
                AppSpacing.gapXS,
                SizedBox(
                  height: 44,
                  width: 44,
                  child: IconButton.filled(
                    style: IconButton.styleFrom(
                        backgroundColor: AppColors.lightPrimary),
                    onPressed: _isSending || _isBlocked ? null : _sendMessage,
                    icon: _isSending
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.send_rounded,
                            color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
