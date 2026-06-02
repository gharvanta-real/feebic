import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_spacing.dart';
import 'package:feebic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:feebic_mobile/features/shared/widgets/optimized_network_image.dart';

class _StoryItem {
  const _StoryItem({
    required this.name,
    required this.imageUrl,
    required this.isMe,
  });

  final String name;
  final String imageUrl;
  final bool isMe;
}

const List<_StoryItem> _stories = [
  _StoryItem(
    name: 'My Story',
    imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    isMe: true,
  ),
  _StoryItem(
    name: 'alexandra',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    isMe: false,
  ),
  _StoryItem(
    name: 'chef_g',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
    isMe: false,
  ),
  _StoryItem(
    name: 'sam_fit',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    isMe: false,
  ),
  _StoryItem(
    name: 'lucia_fit',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
    isMe: false,
  ),
];

class StoriesBar extends StatefulWidget {
  const StoriesBar({super.key});

  @override
  State<StoriesBar> createState() => _StoriesBarState();
}

class _StoriesBarState extends State<StoriesBar> {
  final Set<int> _seenStories = <int>{};
  bool _didPrecache = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didPrecache) return;
    _didPrecache = true;
    for (final story in _stories) {
      precacheImage(CachedNetworkImageProvider(story.imageUrl), context);
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

            return GestureDetector(
              onTap: () {
                setState(() => _seenStories.add(index));
                showDialog(
                  context: context,
                  builder: (context) => Dialog(
                    insetPadding: const EdgeInsets.all(AppSpacing.md),
                    child: AspectRatio(
                      aspectRatio: 0.72,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          OptimizedNetworkImage(
                            imageUrl: story.imageUrl,
                            fit: BoxFit.cover,
                            cacheExtentMultiplier: 2,
                          ),
                          Positioned(
                            top: AppSpacing.md,
                            left: AppSpacing.md,
                            right: AppSpacing.md,
                            child: Row(
                              children: [
                                UserAvatar(
                                    imageUrl: story.imageUrl, radius: 18),
                                AppSpacing.gapSM,
                                Text(
                                  story.name,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold),
                                ),
                                const Spacer(),
                                IconButton(
                                  icon: const Icon(Icons.close_rounded,
                                      color: Colors.white),
                                  onPressed: () => Navigator.pop(context),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                child: Column(
                  children: [
                    UserAvatar(
                      imageUrl: story.imageUrl,
                      radius: 28,
                      hasStory: !story.isMe && !_seenStories.contains(index),
                    ),
                    AppSpacing.gapXXS,
                    Text(
                      story.name,
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
