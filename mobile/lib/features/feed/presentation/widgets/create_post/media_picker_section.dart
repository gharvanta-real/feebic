import 'dart:io';
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
    required this.selectedLocalPath,
    required this.selectedVideoUrl,
    required this.onVideoModeChanged,
    required this.onPickFromDevice,
  });

  final bool isVideo;
  final String selectedMediaUrl;
  final String? selectedLocalPath;
  final String? selectedVideoUrl;
  final ValueChanged<bool> onVideoModeChanged;
  final VoidCallback onPickFromDevice;

  @override
  Widget build(BuildContext context) {
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
          subtitle: 'Upload real media from this device.',
          icon: Icons.collections_rounded,
          child: Column(
            children: [
              AspectRatio(
                aspectRatio: 1.35,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: AppRadius.rSM,
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: ClipRRect(
                    borderRadius: AppRadius.rSM,
                    child: selectedLocalPath != null && !isVideo
                        ? Image.file(File(selectedLocalPath!),
                            fit: BoxFit.cover)
                        : selectedMediaUrl.isNotEmpty
                            ? OptimizedNetworkImage(
                                imageUrl: selectedMediaUrl,
                                fit: BoxFit.cover,
                              )
                            : Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      isVideo
                                          ? Icons.video_library_outlined
                                          : Icons.add_photo_alternate_outlined,
                                      size: 34,
                                    ),
                                    AppSpacing.gapSM,
                                    const Text(
                                      'No media selected',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                  ),
                ),
              ),
              AppSpacing.gapMD,
              FilledButton.icon(
                onPressed: onPickFromDevice,
                icon: const Icon(Icons.upload_rounded),
                label: Text(isVideo ? 'Choose video' : 'Choose photo'),
              ),
            ],
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
