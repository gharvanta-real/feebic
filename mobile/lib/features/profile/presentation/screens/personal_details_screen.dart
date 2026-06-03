import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/cloudinary_service.dart';
import '../../../../core/di/injection.dart';
import '../../../shared/widgets/user_avatar.dart';

class PersonalDetailsScreen extends StatefulWidget {
  final bool isCreatorMode;
  const PersonalDetailsScreen({super.key, required this.isCreatorMode});

  @override
  State<PersonalDetailsScreen> createState() => _PersonalDetailsScreenState();
}

class _PersonalDetailsScreenState extends State<PersonalDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _nameController;
  late TextEditingController _usernameController;
  late TextEditingController _bioController;
  late TextEditingController _locationController;
  late TextEditingController _websiteController;
  late TextEditingController _phoneController;
  late TextEditingController _countryController;

  String _avatarUrl = '';
  String _coverUrl = '';
  
  bool _isSaving = false;
  bool _isUploadingAvatar = false;
  bool _isUploadingCover = false;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final user = getIt<AuthSession>().user ?? {};
    
    _nameController = TextEditingController(text: (user['display_name'] ?? '').toString());
    _usernameController = TextEditingController(text: (user['username'] ?? '').toString());
    _bioController = TextEditingController(text: (user['bio'] ?? '').toString());
    _locationController = TextEditingController(text: (user['location'] ?? '').toString());
    _websiteController = TextEditingController(text: (user['website'] ?? '').toString());
    _phoneController = TextEditingController(text: (user['phone'] ?? '').toString());
    _countryController = TextEditingController(text: (user['country'] ?? '').toString());
    
    _avatarUrl = (user['avatar'] ?? '').toString();
    _coverUrl = (user['cover_photo'] ?? '').toString();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    _locationController.dispose();
    _websiteController.dispose();
    _phoneController.dispose();
    _countryController.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    try {
      final pickedFile = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
      if (pickedFile == null) return;

      setState(() => _isUploadingAvatar = true);
      final file = File(pickedFile.path);
      final username = getIt<AuthSession>().user?['username']?.toString() ?? 'unknown';
      final url = await getIt<CloudinaryService>().uploadFile(file, username: username, type: 'profiles');
      
      setState(() {
        _avatarUrl = url;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Avatar uploaded successfully!'), behavior: SnackBarBehavior.floating),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
      }
    }
  }

  Future<void> _pickCoverPhoto() async {
    try {
      final pickedFile = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
      if (pickedFile == null) return;

      setState(() => _isUploadingCover = true);
      final file = File(pickedFile.path);
      final username = getIt<AuthSession>().user?['username']?.toString() ?? 'unknown';
      final url = await getIt<CloudinaryService>().uploadFile(file, username: username, type: 'profiles');
      
      setState(() {
        _coverUrl = url;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cover banner uploaded successfully!'), behavior: SnackBarBehavior.floating),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingCover = false);
      }
    }
  }

  void _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSaving = true);
    
    final cleanUsername = _usernameController.text
        .trim()
        .toLowerCase()
        .replaceFirst('@', '')
        .replaceAll(RegExp(r'[^a-z0-9_]'), '');

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Username must be between 3 and 30 characters.'), behavior: SnackBarBehavior.floating),
      );
      setState(() => _isSaving = false);
      return;
    }

    try {
      final response = await getIt<ApiClient>().put('/users/profile', data: {
        'display_name': _nameController.text.trim(),
        'username': cleanUsername,
        'bio': _bioController.text.trim(),
        'avatar': _avatarUrl,
        'cover_photo': _coverUrl,
        'location': _locationController.text.trim(),
        'website': _websiteController.text.trim(),
        'phone': _phoneController.text.trim(),
        'country': _countryController.text.trim(),
      });

      if (response.statusCode == 200) {
        await getIt<AuthSession>().refreshProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile updated successfully!'), behavior: SnackBarBehavior.floating),
          );
          Navigator.pop(context);
        }
      } else {
        throw Exception('Profile update failed with status: ${response.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit profile',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            _buildAvatarBannerEditor(context, isDark),
            AppSpacing.gapLG,
            
            // Name field
            _buildField(_nameController, 'Display Name',
                (val) => val == null || val.trim().isEmpty ? 'Display name required' : null),
            AppSpacing.gapMD,
            
            // Username field
            _buildField(_usernameController, 'Username',
                (val) => val == null || val.trim().isEmpty ? 'Username required' : null),
            AppSpacing.gapMD,
            
            // Bio field (Multiline)
            _buildField(_bioController, 'Bio', null, maxLines: 3),
            AppSpacing.gapMD,

            // Row: Location & Website
            Row(
              children: [
                Expanded(
                  child: _buildField(_locationController, 'Location', null, prefixIcon: Icons.location_on_rounded),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _buildField(_websiteController, 'Website', null, prefixIcon: Icons.link_rounded),
                ),
              ],
            ),
            AppSpacing.gapMD,

            // Row: Phone & Country
            Row(
              children: [
                Expanded(
                  child: _buildField(_phoneController, 'Phone Number', null, prefixIcon: Icons.phone_rounded),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _buildField(_countryController, 'Country', null, prefixIcon: Icons.public_rounded),
                ),
              ],
            ),
            
            AppSpacing.gapXL,
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
              onPressed: _isSaving ? null : _saveChanges,
              child: _isSaving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('save changes',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarBannerEditor(BuildContext context, bool isDark) {
    const bannerHeight = 110.0;
    const avatarRadius = 38.0;
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final bannerFallback = isDark ? Colors.grey[900]! : Colors.grey[200]!;

    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            // Cover Photo Banner
            GestureDetector(
              onTap: _pickCoverPhoto,
              child: Container(
                height: bannerHeight,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: bannerFallback,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 0.8),
                  image: _coverUrl.isNotEmpty
                      ? DecorationImage(
                          image: NetworkImage(_coverUrl),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: _isUploadingCover
                    ? const Center(child: CircularProgressIndicator(color: Colors.white))
                    : _coverUrl.isEmpty
                        ? Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.5),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.photo_camera_rounded, color: Colors.white, size: 14),
                                  SizedBox(width: 4),
                                  Text('Add Cover Banner', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          )
                        : Align(
                            alignment: Alignment.topRight,
                            child: Container(
                              margin: const EdgeInsets.all(8),
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.5),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.edit_rounded, color: Colors.white, size: 14),
                            ),
                          ),
              ),
            ),
            // Avatar (overlapping banner bottom)
            Positioned(
              top: bannerHeight - avatarRadius,
              child: GestureDetector(
                onTap: _pickAvatar,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          width: 3,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: UserAvatar(
                        imageUrl: _avatarUrl,
                        radius: avatarRadius,
                      ),
                    ),
                    if (_isUploadingAvatar)
                      Positioned.fill(
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Colors.black45,
                            shape: BoxShape.circle,
                          ),
                          child: const Center(
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            ),
                          ),
                        ),
                      )
                    else
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.photo_camera_rounded,
                            color: Colors.white,
                            size: 10,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: avatarRadius + 8),
        Text(
          'Tap avatar or banner to upload device photo.',
          style: TextStyle(
            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
            fontSize: 9.5,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildField(TextEditingController controller, String label,
      String? Function(String?)? validator,
      {int maxLines = 1, IconData? prefixIcon}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      style: const TextStyle(fontSize: 12.5),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 11.5),
        border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
        isDense: true,
        prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 16) : null,
      ),
      validator: validator,
    );
  }
}
