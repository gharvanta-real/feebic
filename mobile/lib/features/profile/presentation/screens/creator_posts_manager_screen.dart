import 'package:flutter/material.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/post_model.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/optimized_network_image.dart';

class CreatorPostsManagerScreen extends StatefulWidget {
  const CreatorPostsManagerScreen({super.key});

  @override
  State<CreatorPostsManagerScreen> createState() =>
      _CreatorPostsManagerScreenState();
}

class _CreatorPostsManagerScreenState extends State<CreatorPostsManagerScreen> {
  final List<PostModel> _posts = [];
  bool _loading = true;
  String? _busyPostId;

  @override
  void initState() {
    super.initState();
    _fetchPosts();
  }

  Future<void> _fetchPosts() async {
    setState(() => _loading = true);
    try {
      final response =
          await getIt<ApiClient>().get('/posts/mine', queryParameters: {
        'limit': 50,
      });
      final data = response.data;
      final list = data is List ? data : <dynamic>[];
      _posts
        ..clear()
        ..addAll(list
            .map((item) => PostModel.fromJson(Map<String, dynamic>.from(item)))
            .toList());
    } catch (error) {
      _showSnack('Unable to load posts');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updatePost(String id, Map<String, dynamic> payload) async {
    setState(() => _busyPostId = id);
    try {
      await getIt<ApiClient>().put('/posts/$id', data: payload);
      await _fetchPosts();
      _showSnack('Post updated');
    } catch (error) {
      _showSnack('Unable to update post');
    } finally {
      if (mounted) setState(() => _busyPostId = null);
    }
  }

  Future<void> _deletePost(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete post?'),
        content: const Text('This permanently removes the post.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _busyPostId = id);
    try {
      await getIt<ApiClient>().delete('/posts/$id');
      _posts.removeWhere((post) => post.id == id);
      _showSnack('Post deleted');
    } catch (error) {
      _showSnack('Unable to delete post');
    } finally {
      if (mounted) setState(() => _busyPostId = null);
    }
  }

  Future<void> _editPost(PostModel post) async {
    final contentController = TextEditingController(text: post.content);
    final priceController =
        TextEditingController(text: post.price.toStringAsFixed(0));
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: AppSpacing.md,
          right: AppSpacing.md,
          top: AppSpacing.md,
          bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Edit post',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            AppSpacing.gapSM,
            TextField(
              controller: contentController,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(labelText: 'Caption'),
            ),
            AppSpacing.gapSM,
            TextField(
              controller: priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Price Rs'),
            ),
            AppSpacing.gapMD,
            FilledButton(
              onPressed: () => Navigator.pop(context, {
                'content': contentController.text,
                'price': double.tryParse(priceController.text) ?? 0,
                'is_premium': post.isPremium,
              }),
              child: const Text('Save changes'),
            ),
          ],
        ),
      ),
    );
    contentController.dispose();
    priceController.dispose();

    if (result != null) {
      await _updatePost(post.id, result);
    }
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).brightness == Brightness.dark
        ? AppColors.darkPrimary
        : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Posts'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchPosts,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _posts.isEmpty
                ? ListView(
                    padding: AppSpacing.pAllMD,
                    children: const [
                      SizedBox(height: 120),
                      Center(child: Text('No posts yet')),
                    ],
                  )
                : ListView.separated(
                    padding: AppSpacing.pAllMD,
                    itemBuilder: (context, index) =>
                        _buildPostCard(_posts[index], primary),
                    separatorBuilder: (_, __) => AppSpacing.gapSM,
                    itemCount: _posts.length,
                  ),
      ),
    );
  }

  Widget _buildPostCard(PostModel post, Color primary) {
    final busy = _busyPostId == post.id;
    final thumb = post.mediaUrls.isNotEmpty ? post.mediaUrls.first : '';

    return Container(
      padding: AppSpacing.pAllSM,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: SizedBox(
                  width: 74,
                  height: 74,
                  child: thumb.isEmpty
                      ? Container(
                          color: Colors.black12,
                          child: const Icon(Icons.article_outlined),
                        )
                      : OptimizedNetworkImage(
                          imageUrl: thumb,
                          fit: BoxFit.cover,
                        ),
                ),
              ),
              AppSpacing.gapSM,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _pill(post.status, primary),
                        _pill(post.visibility, Colors.blueGrey),
                        if (post.isPremium)
                          _pill('Rs ${post.price}', Colors.green),
                      ],
                    ),
                    AppSpacing.gapXS,
                    Text(
                      post.content.isEmpty ? 'No caption' : post.content,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    AppSpacing.gapXS,
                    Text(
                      '${post.likes} likes  ${post.commentsCount} comments  ${post.unlocksCount} unlocks',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          AppSpacing.gapSM,
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _action('Edit', busy, () => _editPost(post)),
              _action('Publish', busy,
                  () => _updatePost(post.id, {'status': 'published'})),
              _action('Hide', busy,
                  () => _updatePost(post.id, {'status': 'hidden'})),
              _action('Archive', busy,
                  () => _updatePost(post.id, {'status': 'archived'})),
              _action('Public', busy,
                  () => _updatePost(post.id, {'visibility': 'public'})),
              _action('Subs', busy,
                  () => _updatePost(post.id, {'visibility': 'subscribers'})),
              _action('Private', busy,
                  () => _updatePost(post.id, {'visibility': 'private'})),
              _action('Delete', busy, () => _deletePost(post.id), danger: true),
            ],
          ),
        ],
      ),
    );
  }

  Widget _pill(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _action(String label, bool busy, VoidCallback onTap,
      {bool danger = false}) {
    return OutlinedButton(
      onPressed: busy ? null : onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: danger ? Colors.red : null,
        minimumSize: const Size(0, 34),
      ),
      child: Text(label),
    );
  }
}
