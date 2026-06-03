import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/cloudinary_service.dart';
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
  String _selectedMediaUrl = '';
  String? _selectedLocalPath;
  String? _selectedVideoUrl;
  File? _selectedFile;
  final List<String> _selectedTiers = ['Free Subscribers'];

  final _captionController = TextEditingController();
  late final TextEditingController _watermarkController;
  final List<TextEditingController> _pollControllers = [
    TextEditingController(text: 'More behind the scenes'),
    TextEditingController(text: 'Long-form tutorial'),
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
    _watermarkController = TextEditingController(text: '@creator');
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

  Future<void> _pickMedia() async {
    final picker = ImagePicker();
    final picked = _isVideo
        ? await picker.pickVideo(source: ImageSource.gallery)
        : await picker.pickImage(
            source: ImageSource.gallery,
            imageQuality: 92,
          );
    if (picked == null) return;
    setState(() {
      _selectedFile = File(picked.path);
      _selectedLocalPath = picked.path;
      _selectedMediaUrl = '';
      _selectedVideoUrl = _isVideo ? picked.path : null;
    });
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
    try {
      if (getIt<AuthSession>().role != 'creator') {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Only creator accounts can publish posts. Please sign in as a creator.',
            ),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      if (_selectedFile == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Choose media from your device before publishing.'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      final uploadedUrl = await getIt<CloudinaryService>().uploadFile(
        _selectedFile!,
        type: _isVideo ? 'videos' : 'posts',
      );

      final List<String> mediaUrls = [];
      mediaUrls.add(uploadedUrl);

      final payload = {
        'content': _captionController.text.trim().isEmpty
            ? 'New exclusive post is ready for fans.'
            : _captionController.text.trim(),
        'media_urls': mediaUrls,
        'media_type': _isVideo ? 'video' : 'image',
        'is_premium': _isLocked,
        'price': _isLocked ? _unlockPrice : 0.0,
        'poll': _enablePoll
            ? {
                'question': 'Which content do you prefer?',
                'options': _pollControllers
                    .map((c) => {'text': c.text, 'votes': 0.0})
                    .toList(),
              }
            : null,
        'fundraiser': null,
        'teaser_url': '',
        'publish_at': '',
        'target_list_id': '',
      };

      final response = await getIt<ApiClient>().post('/posts', data: payload);

      if (response.statusCode == 201) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isScheduled
                ? 'Post scheduled successfully.'
                : 'Post published successfully.'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to publish post to backend server.'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on DioException catch (e) {
      debugPrint('Error publishing post: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_publishErrorMessage(e)),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      debugPrint('Error publishing post: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Connection error: Failed to publish post.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isPublishing = false);
      }
    }
  }

  String _publishErrorMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] != null) {
      return data['error'].toString();
    }
    if (e.response?.statusCode == 403) {
      return 'Only creator accounts can publish posts.';
    }
    if (e.response?.statusCode == 401) {
      return 'Please sign in again before publishing.';
    }
    return 'Connection error: Failed to publish post.';
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
                        selectedLocalPath: _selectedLocalPath,
                        selectedVideoUrl: _selectedVideoUrl,
                        onVideoModeChanged: (value) {
                          setState(() {
                            _isVideo = value;
                            _selectedMediaUrl = '';
                            _selectedLocalPath = null;
                            _selectedVideoUrl = null;
                            _selectedFile = null;
                          });
                        },
                        onPickFromDevice: _pickMedia,
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
                          localMediaPath: _selectedLocalPath,
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
