import 'package:flutter/material.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/di/injection.dart';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  bool _isSaving = false;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  void _deleteAccount() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSaving = true);
    
    try {
      final response = await getIt<ApiClient>().delete('/users/account', data: {
        'password': _passwordController.text,
      });

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Your account has been deleted permanently.'), behavior: SnackBarBehavior.floating),
          );
          // Pop settings stack
          Navigator.pop(context); // Pop DeleteAccountScreen
          Navigator.pop(context); // Pop AccountsCentreScreen
          Navigator.pop(context); // Pop SettingsScreen
          
          // Trigger logout
          getIt<AuthSession>().logout();
        }
      } else {
        throw Exception('Account deletion failed with status: ${response.statusCode}');
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Delete account',
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
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(isDark ? 0.08 : 0.05),
                borderRadius: AppRadius.rMD,
                border: Border.all(color: Colors.red.withOpacity(0.2), width: 0.8),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.red, size: 24),
                  AppSpacing.gapSM,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Warning: Irreversible Action', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13)),
                        SizedBox(height: 4),
                        Text(
                          'Permanently erase your entire profile data, subscribers history, wallet records, and posted catalog. This action cannot be undone.',
                          style: TextStyle(color: Colors.grey, fontSize: 10, height: 1.45),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
            AppSpacing.gapLG,
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              style: const TextStyle(fontSize: 13),
              decoration: const InputDecoration(
                labelText: 'Enter Password to Confirm',
                border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
                isDense: true,
                prefixIcon: Icon(Icons.lock_outline_rounded, size: 16),
              ),
              validator: (val) {
                if (val == null || val.isEmpty) {
                  return 'Password is required to delete account';
                }
                return null;
              },
            ),
            AppSpacing.gapXL,
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
              onPressed: _isSaving ? null : _deleteAccount,
              child: _isSaving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('Delete My Account Permanently',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ],
        ),
      ),
    );
  }
}
