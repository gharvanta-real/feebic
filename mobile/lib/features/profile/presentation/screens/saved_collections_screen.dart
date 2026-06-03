import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/post_model.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/optimized_network_image.dart';
import '../screens/creator_posts_screen.dart';

class SavedCollectionsScreen extends StatefulWidget {
  const SavedCollectionsScreen({super.key});

  @override
  State<SavedCollectionsScreen> createState() => _SavedCollectionsScreenState();
}

class _SavedCollectionsScreenState extends State<SavedCollectionsScreen> {
  bool _isLoading = true;
  List<PostModel> _savedPosts = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchSaved();
  }

  Future<void> _fetchSaved() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final response = await getIt<ApiClient>().get('/posts/bookmarks');
      final List<dynamic> raw = response.data is List
          ? response.data as List
          : ((response.data as Map<String, dynamic>?)?['posts'] ?? []) as List;
      final posts = raw
          .whereType<Map>()
          .map((e) => PostModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      if (!mounted) return;
      setState(() {
        _savedPosts = posts;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('SavedCollectionsScreen: $e');
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Failed to load saved posts. Pull to refresh.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved collections',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: _fetchSaved,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchSaved,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
                ? Center(
                    child: Padding(
                      padding: AppSpacing.pAllMD,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline_rounded,
                              size: 40,
                              color: Theme.of(context).colorScheme.error),
                          AppSpacing.gapSM,
                          Text(_errorMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 13)),
                          AppSpacing.gapMD,
                          ElevatedButton.icon(
                            onPressed: _fetchSaved,
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Try Again'),
                          ),
                        ],
                      ),
                    ),
                  )
                : _savedPosts.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(
                            height: MediaQuery.of(context).size.height * 0.5,
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.bookmark_border_rounded,
                                      size: 40,
                                      color: Colors.grey.withOpacity(0.5)),
                                  AppSpacing.gapSM,
                                  const Text('No saved posts yet',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13)),
                                  const SizedBox(height: 4),
                                  const Text(
                                      'Tap bookmark icon on posts to save.',
                                      style: TextStyle(
                                          color: Colors.grey, fontSize: 11)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        addAutomaticKeepAlives: false,
                        addRepaintBoundaries: true,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 6,
                          mainAxisSpacing: 6,
                        ),
                        itemCount: _savedPosts.length,
                        itemBuilder: (context, index) {
                          final post = _savedPosts[index];
                          final imageUrl = post.mediaUrls.isNotEmpty
                              ? post.mediaUrls.first
                              : '';
                          return GestureDetector(
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => CreatorPostsScreen(
                                  username: post.creatorUsername,
                                  posts: _savedPosts,
                                  initialIndex: index,
                                ),
                              ),
                            ).then((_) => _fetchSaved()),
                            child: ClipRRect(
                              borderRadius: AppRadius.rSM,
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  OptimizedNetworkImage(
                                    imageUrl: imageUrl,
                                    fit: BoxFit.cover,
                                    cacheExtentMultiplier: 0.8,
                                  ),
                                  if (post.mediaType == 'video')
                                    const Positioned(
                                      top: 4,
                                      left: 4,
                                      child: Icon(Icons.play_circle_fill,
                                          color: Colors.white, size: 16),
                                    ),
                                  const Positioned(
                                    bottom: 4,
                                    right: 4,
                                    child: Icon(Icons.bookmark_rounded,
                                        color: Colors.white, size: 14),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
