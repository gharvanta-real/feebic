import 'package:flutter/material.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../widgets/create_post/caption_tools_section.dart';
import '../widgets/create_post/create_post_section.dart';
import '../widgets/create_post/media_picker_section.dart';
import '../widgets/create_post/post_composer_action_bar.dart';
import '../widgets/create_post/post_preview_card.dart';

class CreatePostScreen extends StatefulWidget {
  const CreatePostScreen({super.key});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  int _step = 0;
  bool _isPublishing = false;

  bool _isVideo = false;
  bool _isLocked = true;
  bool _enablePoll = false;
  bool _isScheduled = false;
  bool _enableWatermark = true;

  double _unlockPrice = 399;
  double _blurSigma = 15;
  String _selectedMediaUrl =
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f';
  String? _selectedVideoUrl;
  final List<String> _selectedTiers = ['Free Subscribers'];

  final _captionController = TextEditingController();
  late final TextEditingController _watermarkController;
  final List<TextEditingController> _pollControllers = [
    TextEditingController(text: 'More behind the scenes'),
    TextEditingController(text: 'Long-form tutorial'),
  ];

  static const _imagePresets = [
    MediaPreset(
      name: 'Studio portrait',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
    ),
    MediaPreset(
      name: 'Digital artwork',
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
    ),
    MediaPreset(
      name: 'Fitness session',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
    ),
    MediaPreset(
      name: 'Travel set',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    ),
  ];

  static const _videoPresets = [
    MediaPreset(
      name: 'Art process trailer',
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      videoUrl:
          'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Npa3JzMDl2dHpxMXptcmQ1b3hxdTkybnF4MDFpOHFhc2I2anZ0dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41Yc2nICfMnsgfa8/giphy.gif',
    ),
    MediaPreset(
      name: 'Travel vlog trailer',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
      videoUrl:
          'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGx0MmJ3aDVndThqN3I0ZzRsMGZsdHZ2cjhkZHAzYm42Y25odWN1NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1AgGfR18U6da3o9J1B/giphy.gif',
    ),
  ];

  static const _tags = [
    'exclusive',
    'behindthescenes',
    'vip',
    'tutorial',
    'travel',
    'fitness',
  ];

  @override
  void initState() {
    super.initState();
    _watermarkController = TextEditingController(text: '@${DemoAppState.instance.creatorUsername}');
    _captionController.addListener(_refreshPreview);
    _watermarkController.addListener(_refreshPreview);
  }

  @override
  void dispose() {
    _captionController
      ..removeListener(_refreshPreview)
      ..dispose();
    _watermarkController
      ..removeListener(_refreshPreview)
      ..dispose();
    for (final controller in _pollControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _refreshPreview() {
    if (mounted) setState(() {});
  }

  void _addTag(String tag) {
    final text = _captionController.text.trimRight();
    _captionController.text = text.isEmpty ? '#$tag ' : '$text #$tag ';
    _captionController.selection = TextSelection.collapsed(
      offset: _captionController.text.length,
    );
  }

  void _addPollOption() {
    if (_pollControllers.length >= 5) return;
    setState(() {
      _pollControllers.add(
          TextEditingController(text: 'Option ${_pollControllers.length + 1}'));
    });
  }

  void _removePollOption(int index) {
    if (_pollControllers.length <= 2) return;
    setState(() {
      _pollControllers.removeAt(index).dispose();
    });
  }

  void _toggleTier(String tier) {
    setState(() {
      if (_selectedTiers.contains(tier)) {
        if (_selectedTiers.length > 1) _selectedTiers.remove(tier);
      } else {
        _selectedTiers.add(tier);
      }
    });
  }

  void _next() {
    if (_step < 2) {
      setState(() => _step += 1);
      return;
    }
    _publish();
  }

  Future<void> _publish() async {
    setState(() => _isPublishing = true);
    await Future<void>.delayed(const Duration(milliseconds: 650));
    if (!mounted) return;

    DemoAppState.instance.addPost(
      DemoPost(
        postId: 'new_post_${DateTime.now().millisecondsSinceEpoch}',
        username: DemoAppState.instance.creatorUsername,
        avatarUrl: DemoAppState.instance.creatorAvatar,
        isVerified: true,
        caption: _captionController.text.trim().isEmpty
            ? 'New exclusive post is ready for fans.'
            : _captionController.text.trim(),
        imageUrl: _selectedMediaUrl,
        videoUrl: _isVideo ? _selectedVideoUrl : null,
        isLocked: _isLocked,
        unlockPrice: _isLocked ? 'Rs ${_unlockPrice.round()}' : null,
        isVideo: _isVideo,
      ),
    );

    setState(() => _isPublishing = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_isScheduled
            ? 'Post scheduled and added to feed preview.'
            : 'Post published to feed.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Post'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          Column(
            children: [
              _ProgressHeader(step: _step),
              const Divider(height: 1),
              Expanded(
                child: ListView(
                  padding: AppSpacing.pAllMD,
                  children: [
                    if (_step == 0)
                      MediaPickerSection(
                        isVideo: _isVideo,
                        selectedMediaUrl: _selectedMediaUrl,
                        selectedVideoUrl: _selectedVideoUrl,
                        imagePresets: _imagePresets,
                        videoPresets: _videoPresets,
                        onVideoModeChanged: (value) {
                          final preset =
                              value ? _videoPresets.first : _imagePresets.first;
                          setState(() {
                            _isVideo = value;
                            _selectedMediaUrl = preset.imageUrl;
                            _selectedVideoUrl = preset.videoUrl;
                          });
                        },
                        onPresetSelected: (preset) {
                          setState(() {
                            _selectedMediaUrl = preset.imageUrl;
                            _selectedVideoUrl = preset.videoUrl;
                          });
                        },
                      ),
                    if (_step == 1)
                      CaptionToolsSection(
                        captionController: _captionController,
                        tags: _tags,
                        pollEnabled: _enablePoll,
                        scheduled: _isScheduled,
                        scheduleText: 'June 3, 2026 at 09:30 AM',
                        pollOptions: _pollControllers,
                        onTagSelected: _addTag,
                        onPollChanged: (value) =>
                            setState(() => _enablePoll = value),
                        onScheduledChanged: (value) =>
                            setState(() => _isScheduled = value),
                        onAddPollOption: _addPollOption,
                        onRemovePollOption: _removePollOption,
                      ),
                    if (_step == 2) ...[
                      MonetizationSection(
                        locked: _isLocked,
                        price: _unlockPrice,
                        blur: _blurSigma,
                        watermarkEnabled: _enableWatermark,
                        watermarkController: _watermarkController,
                        selectedTiers: _selectedTiers,
                        onLockedChanged: (value) =>
                            setState(() => _isLocked = value),
                        onPriceChanged: (value) =>
                            setState(() => _unlockPrice = value),
                        onBlurChanged: (value) =>
                            setState(() => _blurSigma = value),
                        onWatermarkChanged: (value) =>
                            setState(() => _enableWatermark = value),
                        onWatermarkTextChanged: (_) => setState(() {}),
                        onTierToggled: _toggleTier,
                      ),
                      CreatePostSection(
                        title: 'Fan Preview',
                        subtitle: 'This is how the post appears in the feed.',
                        icon: Icons.visibility_rounded,
                        child: PostPreviewCard(
                          caption: _captionController.text,
                          mediaUrl: _selectedMediaUrl,
                          videoUrl: _selectedVideoUrl,
                          isVideo: _isVideo,
                          locked: _isLocked,
                          price: _unlockPrice,
                          blur: _blurSigma,
                          watermarkEnabled: _enableWatermark,
                          watermarkText: _watermarkController.text,
                          pollEnabled: _enablePoll,
                          pollOptions: _pollControllers
                              .map((controller) => controller.text)
                              .toList(),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              PostComposerActionBar(
                step: _step,
                canGoBack: _step > 0,
                onBack: () => setState(() => _step -= 1),
                onNext: _next,
              ),
            ],
          ),
          if (_isPublishing)
            ColoredBox(
              color: Colors.black.withOpacity(0.18),
              child: Center(
                child: Container(
                  width: 220,
                  padding: AppSpacing.pAllMD,
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.darkBackground
                        : AppColors.lightBackground,
                    borderRadius: AppRadius.rSM,
                    border: Border.all(
                      color:
                          isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: primary),
                      AppSpacing.gapMD,
                      const Text(
                        'Publishing post...',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ProgressHeader extends StatelessWidget {
  const _ProgressHeader({required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).primaryColor;
    final titles = ['Media', 'Details', 'Access'];
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: List.generate(titles.length, (index) {
          final active = index <= step;
          return Expanded(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 12,
                  backgroundColor:
                      active ? primary : Colors.grey.withOpacity(0.2),
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(
                      color: active ? Colors.white : Colors.grey,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
                AppSpacing.gapXS,
                Flexible(
                  child: Text(
                    titles[index],
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: active ? null : Colors.grey,
                      fontWeight: active ? FontWeight.bold : FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
                if (index < titles.length - 1)
                  Expanded(
                    child: Container(
                      height: 1,
                      margin:
                          const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                      color: active
                          ? primary.withOpacity(0.45)
                          : Colors.grey.withOpacity(0.2),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }
}
