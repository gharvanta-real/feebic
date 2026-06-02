import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_radius.dart';
import '../../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/optimized_network_image.dart';
import 'create_post_section.dart';

class MediaPreset {
  const MediaPreset({
    required this.name,
    required this.imageUrl,
    this.videoUrl,
  });

  final String name;
  final String imageUrl;
  final String? videoUrl;
}

class MediaPickerSection extends StatelessWidget {
  const MediaPickerSection({
    super.key,
    required this.isVideo,
    required this.selectedMediaUrl,
    required this.selectedVideoUrl,
    required this.imagePresets,
    required this.videoPresets,
    required this.onVideoModeChanged,
    required this.onPresetSelected,
  });

  final bool isVideo;
  final String selectedMediaUrl;
  final String? selectedVideoUrl;
  final List<MediaPreset> imagePresets;
  final List<MediaPreset> videoPresets;
  final ValueChanged<bool> onVideoModeChanged;
  final ValueChanged<MediaPreset> onPresetSelected;

  @override
  Widget build(BuildContext context) {
    final presets = isVideo ? videoPresets : imagePresets;
    return Column(
      children: [
        CreatePostSection(
          title: 'Media Type',
          subtitle: 'Choose public preview media or a video trailer.',
          icon: Icons.perm_media_rounded,
          child: Row(
            children: [
              Expanded(
                child: _ModeButton(
                  label: 'Photo',
                  icon: Icons.photo_outlined,
                  selected: !isVideo,
                  onTap: () => onVideoModeChanged(false),
                ),
              ),
              AppSpacing.gapSM,
              Expanded(
                child: _ModeButton(
                  label: 'Video',
                  icon: Icons.play_circle_outline_rounded,
                  selected: isVideo,
                  onTap: () => onVideoModeChanged(true),
                ),
              ),
            ],
          ),
        ),
        CreatePostSection(
          title: 'Content Asset',
          subtitle: 'Pick the media that fans will see in the feed.',
          icon: Icons.collections_rounded,
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            addAutomaticKeepAlives: false,
            addRepaintBoundaries: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: AppSpacing.sm,
              crossAxisSpacing: AppSpacing.sm,
              childAspectRatio: 1.2,
            ),
            itemCount: presets.length,
            itemBuilder: (context, index) {
              final preset = presets[index];
              final selected = isVideo
                  ? selectedVideoUrl == preset.videoUrl
                  : selectedMediaUrl == preset.imageUrl;
              return _PresetTile(
                preset: preset,
                selected: selected,
                isVideo: isVideo,
                onTap: () => onPresetSelected(preset),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.rSM,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
        decoration: BoxDecoration(
          borderRadius: AppRadius.rSM,
          border: Border.all(color: selected ? primary : border),
          color: selected ? primary.withOpacity(0.08) : Colors.transparent,
        ),
        child: Column(
          children: [
            Icon(icon, size: 26, color: selected ? primary : null),
            AppSpacing.gapXS,
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: selected ? FontWeight.bold : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PresetTile extends StatelessWidget {
  const _PresetTile({
    required this.preset,
    required this.selected,
    required this.isVideo,
    required this.onTap,
  });

  final MediaPreset preset;
  final bool selected;
  final bool isVideo;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.rSM,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: AppRadius.rSM,
          border: Border.all(
            color: selected ? primary : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: ClipRRect(
          borderRadius: AppRadius.rSM,
          child: Stack(
            fit: StackFit.expand,
            children: [
              OptimizedNetworkImage(
                imageUrl: preset.imageUrl,
                fit: BoxFit.cover,
                cacheExtentMultiplier: 0.8,
              ),
              Positioned(
                left: AppSpacing.xs,
                right: AppSpacing.xs,
                bottom: AppSpacing.xs,
                child: Text(
                  preset.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    shadows: [Shadow(color: Colors.black, blurRadius: 8)],
                  ),
                ),
              ),
              if (isVideo)
                const Center(
                  child: Icon(
                    Icons.play_circle_fill_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              if (selected)
                Positioned(
                  top: AppSpacing.xs,
                  right: AppSpacing.xs,
                  child: CircleAvatar(
                    radius: 11,
                    backgroundColor: primary,
                    child: const Icon(Icons.check_rounded,
                        color: Colors.white, size: 16),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
