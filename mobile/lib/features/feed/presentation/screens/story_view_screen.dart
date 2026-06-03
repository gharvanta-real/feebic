import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:felbic_mobile/features/shared/widgets/optimized_network_image.dart';
import 'package:felbic_mobile/features/shared/widgets/user_avatar.dart';
import 'package:felbic_mobile/features/profile/presentation/screens/creator_profile_details_screen.dart';
import 'package:felbic_mobile/core/theme/app_spacing.dart';
import 'package:felbic_mobile/core/di/injection.dart';
import 'package:felbic_mobile/core/network/api_client.dart';
import '../widgets/story_model.dart';

class StoryViewScreen extends StatefulWidget {
  final List<CreatorStoryModel> creators;
  final int initialCreatorIndex;

  const StoryViewScreen({
    super.key,
    required this.creators,
    required this.initialCreatorIndex,
  });

  @override
  State<StoryViewScreen> createState() => _StoryViewScreenState();
}

class _StoryViewScreenState extends State<StoryViewScreen> {
  late PageController _pageController;
  late int _currentCreatorIndex;

  @override
  void initState() {
    super.initState();
    _currentCreatorIndex = widget.initialCreatorIndex;
    _pageController = PageController(initialPage: widget.initialCreatorIndex);

    // Hide status bar for immersive full screen story view
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
  }

  @override
  void dispose() {
    // Restore status bar
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _pageController.dispose();
    super.dispose();
  }

  void _nextCreator() {
    if (_currentCreatorIndex < widget.creators.length - 1) {
      setState(() {
        _currentCreatorIndex++;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.pop(context);
    }
  }

  void _prevCreator() {
    if (_currentCreatorIndex > 0) {
      setState(() {
        _currentCreatorIndex--;
      });
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: PageView.builder(
        controller: _pageController,
        itemCount: widget.creators.length,
        onPageChanged: (index) {
          setState(() {
            _currentCreatorIndex = index;
          });
        },
        itemBuilder: (context, creatorIndex) {
          final creator = widget.creators[creatorIndex];
          return CreatorStoryViewerPage(
            creator: creator,
            isActivePage: _currentCreatorIndex == creatorIndex,
            onNextCreator: _nextCreator,
            onPrevCreator: _prevCreator,
            onClose: () => Navigator.pop(context),
          );
        },
      ),
    );
  }
}

class CreatorStoryViewerPage extends StatefulWidget {
  final CreatorStoryModel creator;
  final bool isActivePage;
  final VoidCallback onNextCreator;
  final VoidCallback onPrevCreator;
  final VoidCallback onClose;

  const CreatorStoryViewerPage({
    super.key,
    required this.creator,
    required this.isActivePage,
    required this.onNextCreator,
    required this.onPrevCreator,
    required this.onClose,
  });

  @override
  State<CreatorStoryViewerPage> createState() => _CreatorStoryViewerPageState();
}

class _CreatorStoryViewerPageState extends State<CreatorStoryViewerPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  final TextEditingController _messageController = TextEditingController();
  int _currentSlideIndex = 0;
  DateTime? _tapDownTime;
  bool _isSendingMessage = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5), // 5 seconds per story slide
    );

    _animationController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _nextSlide();
      }
    });

    if (widget.isActivePage) {
      _animationController.forward();
    }
  }

  @override
  void didUpdateWidget(covariant CreatorStoryViewerPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActivePage && !_animationController.isAnimating) {
      _animationController.forward(from: 0.0);
    } else if (!widget.isActivePage) {
      _animationController.stop();
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _nextSlide() {
    if (!mounted) return;
    if (_currentSlideIndex < widget.creator.slides.length - 1) {
      setState(() {
        _currentSlideIndex++;
      });
      _animationController.forward(from: 0.0);
    } else {
      widget.onNextCreator();
    }
  }

  void _prevSlide() {
    if (!mounted) return;
    if (_currentSlideIndex > 0) {
      setState(() {
        _currentSlideIndex--;
      });
      _animationController.forward(from: 0.0);
    } else {
      widget.onPrevCreator();
    }
  }

  void _navigateToCreatorProfile() {
    _animationController.stop();

    // Restore status bar temporarily when moving to profile page
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreatorProfileDetailsScreen(
          username: widget.creator.username,
          avatarUrl: widget.creator.avatar,
          isVerified: true,
        ),
      ),
    ).then((_) {
      // Re-enable full screen mode on return
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
      if (widget.isActivePage) {
        _animationController.forward();
      }
    });
  }

  Future<void> _sendStoryMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSendingMessage) return;

    setState(() => _isSendingMessage = true);
    try {
      await getIt<ApiClient>().post(
        '/chat/messages',
        data: {
          'receiver_username': widget.creator.username,
          'message': text,
          'media_url': '',
          'media_type': '',
          'is_ppv': false,
          'price': 0,
        },
      );
      if (!mounted) return;
      _messageController.clear();
      FocusScope.of(context).unfocus();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Message sent to @${widget.creator.username}.')),
      );
    } catch (e) {
      debugPrint('Error sending story message: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not send message. Try again.')),
      );
    } finally {
      if (mounted) setState(() => _isSendingMessage = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final slides = widget.creator.slides;
    if (slides.isEmpty) return const SizedBox.shrink();

    final activeSlide = slides[_currentSlideIndex];
    final imageUrl = ApiClient.resolveUrl(activeSlide.url);

    return SafeArea(
      top: false,
      bottom: false,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Content Story Image (optimised network image)
          Positioned.fill(
            child: OptimizedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              cacheExtentMultiplier: 2.0,
            ),
          ),

          // Dark overlays for visual clarity
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.black54, Colors.transparent, Colors.black54],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0.0, 0.2, 0.85],
                ),
              ),
            ),
          ),

          // 2. Gesture Detector Overlay for cycles & pause/resume
          Positioned.fill(
            child: GestureDetector(
              onTapDown: (details) {
                _tapDownTime = DateTime.now();
                _animationController.stop();
              },
              onTapCancel: () {
                if (widget.isActivePage) {
                  _animationController.forward();
                }
              },
              onTapUp: (details) {
                final diff =
                    DateTime.now().difference(_tapDownTime ?? DateTime.now());
                if (diff.inMilliseconds < 300) {
                  // It's a quick tap, so skip/prev
                  final screenWidth = MediaQuery.of(context).size.width;
                  final tapPosition = details.globalPosition.dx;
                  if (tapPosition < screenWidth * 0.3) {
                    // Left 30% tap
                    _prevSlide();
                  } else {
                    // Right 70% tap
                    _nextSlide();
                  }
                } else {
                  // It was a long press hold, just resume play
                  if (widget.isActivePage) {
                    _animationController.forward();
                  }
                }
              },
            ),
          ),

          // 3. Top Progress Indicators & Creator Info Overlay
          Positioned(
            top: MediaQuery.of(context).padding.top + AppSpacing.sm,
            left: AppSpacing.md,
            right: AppSpacing.md,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Progress Indicators Row
                Row(
                  children: List.generate(slides.length, (index) {
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2.0),
                        child: AnimatedBuilder(
                          animation: _animationController,
                          builder: (context, child) {
                            double progress = 0.0;
                            if (index < _currentSlideIndex) {
                              progress = 1.0;
                            } else if (index == _currentSlideIndex) {
                              progress = _animationController.value;
                            }
                            return Container(
                              height: 2.5,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.35),
                                borderRadius: BorderRadius.circular(1.5),
                              ),
                              child: FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: progress,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(1.5),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    );
                  }),
                ),
                AppSpacing.gapSM,

                // Creator details row (Avatar, Username, Time ago, Close)
                Row(
                  children: [
                    GestureDetector(
                      onTap: _navigateToCreatorProfile,
                      child: UserAvatar(
                        imageUrl: widget.creator.avatar,
                        radius: 16,
                      ),
                    ),
                    AppSpacing.gapSM,
                    GestureDetector(
                      onTap: _navigateToCreatorProfile,
                      child: Text(
                        widget.creator.username,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                    AppSpacing.gapXS,
                    Text(
                      activeSlide.time,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 10.5,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: Colors.white, size: 24),
                      onPressed: widget.onClose,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 4. Bottom Message input bar (Instagram style)
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + AppSpacing.md,
            left: AppSpacing.md,
            right: AppSpacing.md,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white60, width: 0.8),
                    ),
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _messageController,
                            onTap: _animationController.stop,
                            onSubmitted: (_) => _sendStoryMessage(),
                            style: const TextStyle(
                                color: Colors.white, fontSize: 13),
                            decoration: const InputDecoration(
                              hintText: 'Send message...',
                              hintStyle: TextStyle(
                                  color: Colors.white70, fontSize: 12.5),
                              border: InputBorder.none,
                              isDense: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                IconButton(
                  icon: const Icon(Icons.favorite_border_rounded,
                      color: Colors.white, size: 22),
                  onPressed: () {
                    HapticFeedback.lightImpact();
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.send_rounded,
                      color: Colors.white, size: 20),
                  onPressed: _isSendingMessage ? null : _sendStoryMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
