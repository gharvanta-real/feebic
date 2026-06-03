import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import 'optimized_network_image.dart';

class VideoPlayerCard extends StatefulWidget {
  final String placeholderImageUrl;
  final String videoUrl;
  final String priceLabel;
  final bool isLocked;
  final VoidCallback onUnlockPressed;

  const VideoPlayerCard({
    super.key,
    required this.placeholderImageUrl,
    required this.videoUrl,
    required this.priceLabel,
    required this.isLocked,
    required this.onUnlockPressed,
  });

  @override
  State<VideoPlayerCard> createState() => _VideoPlayerCardState();
}

class _VideoPlayerCardState extends State<VideoPlayerCard>
    with SingleTickerProviderStateMixin {
  VideoPlayerController? _controller;
  late final AnimationController _fadeController;
  bool _isInitializing = false;
  bool _hasVideoError = false;
  bool _wasPlayingBeforeHold = false;
  String? _gestureLabel;
  int _gestureToken = 0;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    if (!widget.isLocked) {
      _initializeVideo();
    }
  }

  @override
  void didUpdateWidget(covariant VideoPlayerCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isLocked) {
      _disposeVideo();
      return;
    }
    if (oldWidget.videoUrl != widget.videoUrl || oldWidget.isLocked) {
      _disposeVideo();
      _initializeVideo();
    }
  }

  @override
  void dispose() {
    _disposeVideo();
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _initializeVideo() async {
    final resolvedUrl = ApiClient.resolveUrl(widget.videoUrl);
    if (resolvedUrl.trim().isEmpty) return;

    setState(() {
      _isInitializing = true;
      _hasVideoError = false;
    });

    final controller = VideoPlayerController.networkUrl(Uri.parse(resolvedUrl));
    _controller = controller;
    controller.addListener(_onControllerChanged);

    try {
      await controller.initialize();
      await controller.setLooping(false);
      if (!mounted || _controller != controller) return;
      setState(() => _isInitializing = false);
    } catch (e) {
      debugPrint('Error initializing video: $e');
      if (!mounted || _controller != controller) return;
      setState(() {
        _isInitializing = false;
        _hasVideoError = true;
      });
    }
  }

  void _disposeVideo() {
    final controller = _controller;
    _controller = null;
    controller?.removeListener(_onControllerChanged);
    controller?.dispose();
    _fadeController.reverse();
  }

  void _onControllerChanged() {
    final controller = _controller;
    if (!mounted || controller == null) return;
    final isPlaying = controller.value.isPlaying;
    if (isPlaying && _fadeController.status != AnimationStatus.completed) {
      _fadeController.forward();
    } else if (!isPlaying &&
        _fadeController.status != AnimationStatus.dismissed) {
      _fadeController.reverse();
    }
    setState(() {});
  }

  Future<void> _togglePlayback() async {
    if (widget.isLocked) {
      widget.onUnlockPressed();
      return;
    }

    final controller = _controller;
    if (controller == null) {
      await _initializeVideo();
      return;
    }
    if (!controller.value.isInitialized) return;

    if (controller.value.isPlaying) {
      await controller.pause();
    } else {
      if (controller.value.position >= controller.value.duration) {
        await controller.seekTo(Duration.zero);
      }
      await controller.play();
    }
  }

  Future<void> _seekBy(Duration offset) async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    final duration = controller.value.duration;
    final current = controller.value.position;
    var next = current + offset;
    if (next < Duration.zero) next = Duration.zero;
    if (duration > Duration.zero && next > duration) next = duration;
    await controller.seekTo(next);
    _showGestureLabel(offset.isNegative ? '-10s' : '+10s');
  }

  void _showGestureLabel(String label) {
    final token = ++_gestureToken;
    setState(() => _gestureLabel = label);
    Future.delayed(const Duration(milliseconds: 700), () {
      if (!mounted || token != _gestureToken) return;
      setState(() => _gestureLabel = null);
    });
  }

  void _handleDoubleTapDown(TapDownDetails details, double width) {
    if (widget.isLocked) return;
    final isLeftHalf = details.localPosition.dx < width / 2;
    _seekBy(Duration(seconds: isLeftHalf ? -10 : 10));
  }

  void _handleLongPressStart(LongPressStartDetails details) {
    if (widget.isLocked) return;
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    _wasPlayingBeforeHold = controller.value.isPlaying;
    if (_wasPlayingBeforeHold) {
      controller.pause();
      _showGestureLabel('Hold pause');
    }
  }

  void _handleLongPressEnd(LongPressEndDetails details) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    if (_wasPlayingBeforeHold) {
      controller.play();
      _showGestureLabel('Resume');
    }
    _wasPlayingBeforeHold = false;
  }

  void _handleHorizontalDragEnd(DragEndDetails details) {
    if (widget.isLocked) return;
    final velocity = details.primaryVelocity ?? 0;
    if (velocity.abs() < 220) return;
    _seekBy(Duration(seconds: velocity > 0 ? 10 : -10));
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds.remainder(60);
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final controller = _controller;
    final value = controller?.value;
    final isReady = value?.isInitialized ?? false;
    final isPlaying = value?.isPlaying ?? false;
    final duration = isReady ? value!.duration : Duration.zero;
    final position = isReady ? value!.position : Duration.zero;
    final progress = duration.inMilliseconds <= 0
        ? 0.0
        : (position.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0);

    return ClipRRect(
      borderRadius: BorderRadius.zero,
      child: LayoutBuilder(
        builder: (context, constraints) => GestureDetector(
          onTap: _togglePlayback,
          onDoubleTapDown: (details) =>
              _handleDoubleTapDown(details, constraints.maxWidth),
          onLongPressStart: _handleLongPressStart,
          onLongPressEnd: _handleLongPressEnd,
          onHorizontalDragEnd: _handleHorizontalDragEnd,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned.fill(
                child: widget.isLocked
                    ? ImageFiltered(
                        imageFilter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: OptimizedNetworkImage(
                          imageUrl: widget.placeholderImageUrl,
                          fit: BoxFit.cover,
                          cacheExtentMultiplier: 0.75,
                        ),
                      )
                    : isReady
                        ? FittedBox(
                            fit: BoxFit.cover,
                            child: SizedBox(
                              width: value!.size.width,
                              height: value.size.height,
                              child: VideoPlayer(controller!),
                            ),
                          )
                        : OptimizedNetworkImage(
                            imageUrl: widget.placeholderImageUrl,
                            fit: BoxFit.cover,
                          ),
              ),
              Positioned.fill(
                child: Container(
                  color: Colors.black.withOpacity(widget.isLocked ? 0.5 : 0.25),
                ),
              ),
              Positioned(
                top: AppSpacing.sm,
                left: AppSpacing.sm,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: isPlaying ? Colors.red : primaryColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs - 2),
                      Text(
                        widget.isLocked
                            ? 'trailer preview'
                            : isPlaying
                                ? 'playing trailer'
                                : 'video ready',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (widget.isLocked)
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: Colors.white.withOpacity(0.2), width: 1),
                      ),
                      child: const Icon(
                        Icons.lock_outline_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    AppSpacing.gapSM,
                    Text(
                      'unlock full video for ${widget.priceLabel}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                )
              else if (_isInitializing)
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2,
                  ),
                )
              else if (_hasVideoError)
                const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline_rounded,
                        color: Colors.white, size: 28),
                    AppSpacing.gapXS,
                    Text('Video unavailable',
                        style: TextStyle(color: Colors.white, fontSize: 12)),
                  ],
                )
              else
                AnimatedBuilder(
                  animation: _fadeController,
                  builder: (context, child) {
                    return Opacity(
                      opacity: 1.0 - _fadeController.value,
                      child: ScaleTransition(
                        scale: Tween<double>(begin: 1.0, end: 1.5).animate(
                          CurvedAnimation(
                              parent: _fadeController, curve: Curves.easeInOut),
                        ),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.5),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isPlaying
                                ? Icons.pause_rounded
                                : Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              if (_gestureLabel != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.68),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white.withOpacity(0.14)),
                  ),
                  child: Text(
                    _gestureLabel!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              if (!widget.isLocked && isReady)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          Colors.black.withOpacity(0.7),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: double.infinity,
                          height: 2,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(1),
                          ),
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: progress,
                            child: Container(
                              decoration: BoxDecoration(
                                color: primaryColor,
                                borderRadius: BorderRadius.circular(1),
                              ),
                            ),
                          ),
                        ),
                        AppSpacing.gapXS,
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${_formatDuration(position)} / ${_formatDuration(duration)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Icon(
                              isPlaying
                                  ? Icons.pause_rounded
                                  : Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 14,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
