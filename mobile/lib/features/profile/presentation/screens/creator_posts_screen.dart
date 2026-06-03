import 'package:flutter/material.dart';
import 'package:felbic_mobile/features/feed/presentation/widgets/feed_card.dart';
import 'package:felbic_mobile/core/network/post_model.dart';

class CreatorPostsScreen extends StatefulWidget {
  final String username;
  final List<PostModel> posts;
  final int initialIndex;

  const CreatorPostsScreen({
    super.key,
    required this.username,
    required this.posts,
    required this.initialIndex,
  });

  @override
  State<CreatorPostsScreen> createState() => _CreatorPostsScreenState();
}

class _CreatorPostsScreenState extends State<CreatorPostsScreen> {
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    
    // Jump to the clicked post index offset after the list finishes layout
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialIndex > 0 && _scrollController.hasClients) {
        // Average FeedCard height is roughly 580px
        _scrollController.jumpTo(widget.initialIndex * 580.0);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            const Text(
              'Posts',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            Text(
              '@${widget.username}',
              style: TextStyle(
                fontSize: 10,
                color: isDark ? Colors.white60 : Colors.black54,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView.builder(
        controller: _scrollController,
        itemCount: widget.posts.length,
        itemBuilder: (context, index) {
          final post = widget.posts[index];
          return FeedCard(
            username: post.creatorUsername,
            avatarUrl: post.creatorAvatar,
            isVerified: true,
            caption: post.content,
            likes: post.likes,
            comments: post.commentsCount,
            postId: post.id,
            isLiked: post.isLiked,
            isBookmarked: post.isBookmarked,
            imageUrl: post.mediaUrls.isNotEmpty ? post.mediaUrls.first : null,
            videoUrl: post.mediaUrls.isNotEmpty && post.mediaType == 'video'
                ? post.mediaUrls.first
                : null,
            isLocked: post.isLocked,
            unlockPrice: post.price > 0
                ? 'Rs ${post.price.toStringAsFixed(0)}'
                : null,
            isVideo: post.mediaType == 'video',
            onLikePressed: () {},
            onCommentPressed: () {},
            onUnlockPressed: () {
              setState(() {
                post.isUnlocked = true;
              });
            },
          );
        },
      ),
    );
  }
}
