import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/di/injection.dart';
import '../widgets/active_sessions_list.dart';

class PasswordSecurityScreen extends StatefulWidget {
  const PasswordSecurityScreen({super.key});

  @override
  State<PasswordSecurityScreen> createState() => _PasswordSecurityScreenState();
}

class _PasswordSecurityScreenState extends State<PasswordSecurityScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isSaving = false;
  bool _is2FAEnabled = false;

  @override
  void initState() {
    super.initState();
    final user = getIt<AuthSession>().user ?? {};
    _is2FAEnabled = user['two_factor'] == true;
  }

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _changePassword() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSaving = true);
    
    try {
      final response = await getIt<ApiClient>().post('/users/security/password', data: {
        'current_password': _currentController.text,
        'new_password': _newController.text,
      });

      if (response.statusCode == 200) {
        if (mounted) {
          _currentController.clear();
          _newController.clear();
          _confirmController.clear();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Password updated successfully!'), behavior: SnackBarBehavior.floating),
          );
        }
      } else {
        throw Exception('Failed to update password');
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

  void _toggle2FA(bool val) async {
    setState(() => _is2FAEnabled = val);
    
    try {
      final response = await getIt<ApiClient>().put('/users/security/settings', data: {
        'two_factor': val,
      });

      if (response.statusCode == 200) {
        await getIt<AuthSession>().refreshProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('2FA is ${val ? "enabled" : "disabled"}.'), behavior: SnackBarBehavior.floating),
          );
        }
      } else {
        throw Exception('Failed to update 2FA settings');
      }
    } catch (e) {
      // Revert if error
      setState(() => _is2FAEnabled = !val);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Password and security',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Form(
            key: _formKey,
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.darkBorder.withOpacity(0.04)
                    : AppColors.lightBorder.withOpacity(0.04),
                borderRadius: AppRadius.rMD,
                border: Border.all(
                    color:
                        isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    width: 0.8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('change password',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  AppSpacing.gapMD,
                  _buildField(_currentController, 'current password'),
                  AppSpacing.gapSM,
                  _buildField(_newController, 'new password'),
                  AppSpacing.gapSM,
                  _buildField(_confirmController, 'confirm new password',
                      isConfirm: true),
                  AppSpacing.gapMD,
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        minimumSize: const Size.fromHeight(40),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
                    onPressed: _isSaving ? null : _changePassword,
                    child: _isSaving
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : const Text('update password',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),
          AppSpacing.gapLG,
          Container(
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.darkBorder.withOpacity(0.04)
                  : AppColors.lightBorder.withOpacity(0.04),
              borderRadius: AppRadius.rMD,
              border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  width: 0.8),
            ),
            child: SwitchListTile(
              title: const Text('two-factor authentication (2fa)',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              subtitle: const Text(
                  'require verification code sent to phone at login',
                  style: TextStyle(fontSize: 9.5)),
              value: _is2FAEnabled,
              activeColor: primaryColor,
              onChanged: _toggle2FA,
            ),
          ),
          AppSpacing.gapLG,
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
            child: Text('where you\'re logged in',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey)),
          ),
          ActiveSessionsList(isDark: isDark, primaryColor: primaryColor),
        ],
      ),
    );
  }

  Widget _buildField(TextEditingController controller, String label,
      {bool isConfirm = false}) {
    return TextFormField(
      controller: controller,
      obscureText: true,
      style: const TextStyle(fontSize: 13),
      decoration: InputDecoration(
          labelText: label, border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))), isDense: true),
      validator: (val) {
        if (val == null || val.length < 6) {
          return 'at least 6 characters required';
        }
        if (isConfirm && val != _newController.text) {
          return 'passwords do not match';
        }
        return null;
      },
    );
  }
}
