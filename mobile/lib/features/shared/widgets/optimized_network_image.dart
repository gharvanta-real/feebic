import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'skeleton_loader.dart';

class OptimizedNetworkImage extends StatelessWidget {
  const OptimizedNetworkImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
    this.cacheExtentMultiplier = 1.0,
    this.placeholderIcon = Icons.image_outlined,
  });

  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final double cacheExtentMultiplier;
  final IconData placeholderIcon;

  static final CacheManager cacheManager = CacheManager(
    Config(
      'felbicImageCache',
      stalePeriod: const Duration(days: 21),
      maxNrOfCacheObjects: 700,
    ),
  );

  static int _cacheSize(
      double logicalSize, double devicePixelRatio, double multiplier) {
    final size = logicalSize * devicePixelRatio * multiplier;
    return size.clamp(80, 1600).round();
  }

  static String _optimizeImageUrl(String url, double width) {
    if (url.contains('images.unsplash.com')) {
      try {
        final uri = Uri.parse(url);
        final params = Map<String, String>.from(uri.queryParameters);
        params['w'] = width.round().toString();
        params['fit'] = 'crop';
        params['q'] = '80';
        return uri.replace(queryParameters: params).toString();
      } catch (_) {
        return url;
      }
    }
    return url;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final fallbackColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final iconColor =
        isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;

    return RepaintBoundary(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final dpr = MediaQuery.devicePixelRatioOf(context);
          final targetWidth = width ??
              (constraints.hasBoundedWidth ? constraints.maxWidth : 320);
          final targetHeight = height ??
              (constraints.hasBoundedHeight
                  ? constraints.maxHeight
                  : targetWidth);

          final optimizedUrl = _optimizeImageUrl(imageUrl, targetWidth);

          Widget image = CachedNetworkImage(
            imageUrl: optimizedUrl,
            cacheManager: cacheManager,
            width: width,
            height: height,
            fit: fit,
            fadeInDuration: Duration.zero,
            fadeOutDuration: Duration.zero,
            memCacheWidth: _cacheSize(targetWidth, dpr, cacheExtentMultiplier),
            memCacheHeight:
                _cacheSize(targetHeight, dpr, cacheExtentMultiplier),
            maxWidthDiskCache:
                _cacheSize(targetWidth, dpr, cacheExtentMultiplier),
            maxHeightDiskCache:
                _cacheSize(targetHeight, dpr, cacheExtentMultiplier),
            placeholder: (context, url) => SkeletonLoader(
              width: width,
              height: height,
              borderRadius: borderRadius ?? BorderRadius.zero,
            ),
            errorWidget: (context, url, error) => _FallbackBox(
              color: fallbackColor,
              iconColor: iconColor,
              icon: Icons.broken_image_outlined,
            ),
          );

          if (borderRadius != null) {
            image = ClipRRect(borderRadius: borderRadius!, child: image);
          }
          return image;
        },
      ),
    );
  }
}

class _FallbackBox extends StatelessWidget {
  const _FallbackBox({
    required this.color,
    required this.iconColor,
    required this.icon,
  });

  final Color color;
  final Color iconColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: color,
      child: Center(
        child: Icon(icon, color: iconColor, size: 22),
      ),
    );
  }
}
