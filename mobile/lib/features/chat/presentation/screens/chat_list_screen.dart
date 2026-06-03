import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/user_avatar.dart';
import 'chat_details_screen.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _conversations = [];

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    setState(() => _isLoading = true);
    try {
      final response = await getIt<ApiClient>().get('/chat/conversations');
      final data = response.data is List ? response.data as List : <dynamic>[];
      if (!mounted) return;
      setState(() {
        _conversations = data
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } catch (e) {
      debugPrint('Error loading conversations: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('chats',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: RefreshIndicator(
        onRefresh: _loadConversations,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _conversations.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 180),
                      Icon(Icons.chat_bubble_outline_rounded, size: 38),
                      AppSpacing.gapSM,
                      Center(
                        child: Text('no conversations yet',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  )
                : ListView.separated(
                    itemCount: _conversations.length,
                    separatorBuilder: (context, index) =>
                        const Divider(height: 1, indent: 72),
                    itemBuilder: (context, index) {
                      final chat = _conversations[index];
                      final username = (chat['username'] ?? '').toString();
                      final name =
                          (chat['display_name'] ?? chat['name'] ?? username)
                              .toString();
                      final avatar = ApiClient.resolveUrl(
                          (chat['avatar'] ?? '').toString());
                      final message =
                          (chat['last_message'] ?? chat['message'] ?? '')
                              .toString();
                      return ListTile(
                        leading: UserAvatar(imageUrl: avatar, radius: 24),
                        title: Text(name,
                            overflow: TextOverflow.ellipsis,
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(message,
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        onTap: username.isEmpty
                            ? null
                            : () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ChatDetailsScreen(
                                      username: username,
                                      avatarUrl: avatar,
                                    ),
                                  ),
                                ),
                      );
                    },
                  ),
      ),
    );
  }
}
