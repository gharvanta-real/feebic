import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_spacing.dart';
import 'package:felbic_mobile/features/shared/widgets/user_avatar.dart';
import '../screens/story_view_screen.dart';
import 'story_model.dart';

final List<CreatorStoryModel> _fallbackStories = [
  CreatorStoryModel(
    username: 'my_story',
    name: 'My Story',
    avatar: '',
    slides: [],
    isUnread: false,
  )
];

class StoriesBar extends StatefulWidget {
  const StoriesBar({super.key});

  @override
  State<StoriesBar> createState() => _StoriesBarState();
}

class _StoriesBarState extends State<StoriesBar> {
  final Set<int> _seenStories = <int>{};
  List<CreatorStoryModel> _stories = _fallbackStories;
  bool _didPrecache = false;

  @override
  void initState() {
    super.initState();
    _fetchStories();
  }

  Future<void> _fetchStories() async {
    try {
      final response = await getIt<ApiClient>().get('/stories');
      if (response.statusCode != 200 || response.data is! List) return;

      final liveStories = <CreatorStoryModel>[];
      for (final creator in response.data as List) {
        if (creator is! Map) continue;
        final mapCreator = Map<String, dynamic>.from(creator);
        liveStories.add(CreatorStoryModel.fromJson(mapCreator));
      }

      if (!mounted) return;
      setState(() {
        _stories = [..._fallbackStories, ...liveStories];
        _didPrecache = false;
      });
    } catch (e) {
      debugPrint('Error fetching stories: $e');
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didPrecache) return;
    _didPrecache = true;
    for (final story in _stories) {
      if (story.slides.isNotEmpty) {
        precacheImage(CachedNetworkImageProvider(ApiClient.resolveUrl(story.slides.first.url)), context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: SizedBox(
        height: 100,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          itemExtent: 78,
          cacheExtent: 320,
          itemCount: _stories.length,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          itemBuilder: (context, index) {
            final story = _stories[index];
            final isMe = index == 0;

            final String avatar = story.avatar.isNotEmpty
                ? ApiClient.resolveUrl(story.avatar)
                : (story.slides.isNotEmpty ? ApiClient.resolveUrl(story.slides.first.url) : '');

            final hasStorySlides = story.slides.isNotEmpty;
            final isUnread = hasStorySlides && (story.isUnread && !_seenStories.contains(index));

            return GestureDetector(
              onTap: () {
                if (isMe || !hasStorySlides) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Publish story functionality is available for creators in Studio.'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }

                setState(() => _seenStories.add(index));

                // Skip the "My Story" placeholder at index 0
                final activeStories = _stories.skip(1).toList();
                final int initialIndex = index - 1;

                if (initialIndex >= 0 && initialIndex < activeStories.length) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => StoryViewScreen(
                        creators: activeStories,
                        initialCreatorIndex: initialIndex,
                      ),
                    ),
                  ).then((_) {
                    _fetchStories(); // Refresh seen states from API on return
                  });
                }
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                child: Column(
                  children: [
                    UserAvatar(
                      imageUrl: avatar,
                      radius: 28,
                      hasStory: isUnread,
                    ),
                    AppSpacing.gapXXS,
                    Text(
                      isMe ? 'My Story' : story.username,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
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
