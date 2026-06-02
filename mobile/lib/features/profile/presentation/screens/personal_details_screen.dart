import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
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
  late TextEditingController _bioController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final s = DemoAppState.instance;
    if (widget.isCreatorMode) {
      _nameController = TextEditingController(text: s.creatorName);
      _bioController = TextEditingController(text: s.creatorBio);
      _emailController =
          TextEditingController(text: 'lucia.fernandez@gmail.com');
      _phoneController = TextEditingController(text: '+1 (555) 014-9982');
    } else {
      _nameController = TextEditingController(text: s.fanName);
      _bioController = TextEditingController(text: s.fanBio);
      _emailController = TextEditingController(text: s.fanEmail);
      _phoneController = TextEditingController(text: s.fanPhone);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bioController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 800));
    if (widget.isCreatorMode) {
      DemoAppState.instance.updateCreatorProfile(
          name: _nameController.text, bio: _bioController.text);
    } else {
      DemoAppState.instance.updateFanProfile(
          name: _nameController.text,
          bio: _bioController.text,
          email: _emailController.text,
          phone: _phoneController.text);
    }
    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('personal details updated successfully!')));
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Personal details',
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
            Center(
              child: UserAvatar(
                radius: 40,
                imageUrl: widget.isCreatorMode
                    ? DemoAppState.instance.creatorAvatar
                    : DemoAppState.instance.fanAvatar,
              ),
            ),
            AppSpacing.gapLG,
            _buildField(_nameController, 'name',
                (val) => val == null || val.isEmpty ? 'name required' : null),
            AppSpacing.gapMD,
            _buildField(_bioController, 'bio', null, maxLines: 3),
            AppSpacing.gapMD,
            _buildField(
                _emailController,
                'email address',
                (val) =>
                    val == null || !val.contains('@') ? 'invalid email' : null),
            AppSpacing.gapMD,
            _buildField(_phoneController, 'phone number', null),
            AppSpacing.gapXL,
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  minimumSize: const Size.fromHeight(48)),
              onPressed: _isSaving ? null : _saveChanges,
              child: _isSaving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('save changes',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController controller, String label,
      String? Function(String?)? validator,
      {int maxLines = 1}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      style: const TextStyle(fontSize: 13),
      decoration: InputDecoration(
          labelText: label, border: const OutlineInputBorder(), isDense: true),
      validator: validator,
    );
  }
}
