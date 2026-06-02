import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
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
  bool _isPlaying = false;
  double _playbackProgress = 0.0;
  int _elapsedSeconds = 0;
  final int _totalDurationSeconds = 90; // 1:30 duration mock
  Timer? _playbackTimer;

  late AnimationController _fadeController;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _playbackTimer?.cancel();
    _fadeController.dispose();
    super.dispose();
  }

  void _togglePlayback() {
    if (widget.isLocked) {
      widget.onUnlockPressed();
      return;
    }

    setState(() {
      _isPlaying = !_isPlaying;
      if (_isPlaying) {
        _fadeController.forward();
        _startProgressTimer();
      } else {
        _fadeController.reverse();
        _playbackTimer?.cancel();
      }
    });
  }

  void _startProgressTimer() {
    _playbackTimer?.cancel();
    _playbackTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        if (_elapsedSeconds >= _totalDurationSeconds) {
          _elapsedSeconds = 0;
          _playbackProgress = 0.0;
          _isPlaying = false;
          _fadeController.reverse();
          _playbackTimer?.cancel();
        } else {
          _elapsedSeconds++;
          _playbackProgress = _elapsedSeconds / _totalDurationSeconds;
        }
      });
    });
  }

  String _formatDuration(int totalSeconds) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return ClipRRect(
      borderRadius: BorderRadius.zero,
      child: GestureDetector(
        onTap: _togglePlayback,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Background Image (Blurred if locked, normal if playing/paused)
            Positioned.fill(
              child: widget.isLocked
                  ? ImageFiltered(
                      imageFilter: ImageFilter.blur(sigmaX: 12.0, sigmaY: 12.0),
                      child: OptimizedNetworkImage(
                        imageUrl: widget.placeholderImageUrl,
                        fit: BoxFit.cover,
                        cacheExtentMultiplier: 0.75,
                      ),
                    )
                  : OptimizedNetworkImage(
                      imageUrl: _isPlaying
                          ? widget.videoUrl
                          : widget.placeholderImageUrl,
                      fit: BoxFit.cover,
                      cacheExtentMultiplier: _isPlaying ? 1.5 : 1,
                    ),
            ),

            // Subtle dark overlay to ensure high contrast of clean controls
            Positioned.fill(
              child: Container(
                color: Colors.black.withOpacity(widget.isLocked ? 0.5 : 0.25),
              ),
            ),

            // Top Left Status Badge (Standard sentence case, strictly no uppercase)
            Positioned(
              top: AppSpacing.sm,
              left: AppSpacing.sm,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
                        color: _isPlaying ? Colors.red : primaryColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs - 2),
                    Text(
                      widget.isLocked ? 'trailer preview' : 'playing trailer',
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

            // Centered Media Control Action (Lock Icon vs Play/Pause Toggles)
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
                          color: Colors.white.withOpacity(0.2), width: 1.0),
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
                        child: const Icon(
                          Icons.play_arrow_rounded,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                    ),
                  );
                },
              ),

            // Bottom Minimalistic Controls Dock (Only shown when unlocked/playing)
            if (!widget.isLocked)
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
                        Colors.black.withOpacity(0.7)
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Progressive thin seek bar
                      Container(
                        width: double.infinity,
                        height: 2,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(1),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: _playbackProgress,
                          child: Container(
                            decoration: BoxDecoration(
                              color: primaryColor,
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                        ),
                      ),
                      AppSpacing.gapXS,
                      // Minimalist Timecode row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${_formatDuration(_elapsedSeconds)} / ${_formatDuration(_totalDurationSeconds)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Icon(
                            _isPlaying
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
    );
  }
}
