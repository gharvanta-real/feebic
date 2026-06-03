import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/di/injection.dart';

class KycVerificationScreen extends StatefulWidget {
  const KycVerificationScreen({super.key});

  @override
  State<KycVerificationScreen> createState() => _KycVerificationScreenState();
}

class _KycVerificationScreenState extends State<KycVerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(text: 'Alex Rivera');
  String _selectedDocumentType = 'PAN Card';
  bool _isSubmitting = false;

  final List<String> _documentTypes = [
    'PAN Card',
    'Aadhaar Card',
    'Passport',
    'Driver License'
  ];

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _submitKYC() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSubmitting = true);
    
    try {
      final response = await getIt<ApiClient>().post('/users/kyc', data: {
        'legal_name': _nameController.text.trim(),
        'document_type': _selectedDocumentType,
      });

      if (response.statusCode == 200) {
        await getIt<AuthSession>().refreshProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Identity verified successfully!'), behavior: SnackBarBehavior.floating),
          );
        }
      } else {
        throw Exception('KYC submission failed with status: ${response.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final user = getIt<AuthSession>().user ?? {};
    
    final bool kycVerified = user['kyc_verified'] == true;
    final bool kycUploaded = user['kyc_uploaded'] == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Identity verification',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          const Text(
            'Verify your identity to unlock premium creator payouts and verified badge triggers.',
            style: TextStyle(color: Colors.grey, fontSize: 11, height: 1.45),
          ),
          AppSpacing.gapLG,
          
          // Status banners
          if (kycVerified)
            _buildStatusBanner(
              icon: Icons.verified_rounded,
              title: 'Account Verified',
              subtitle: 'You have successfully completed KYC checks. Your verified badge is now active globally!',
              color: Colors.green,
              isDark: isDark,
            )
          else if (kycUploaded)
            _buildStatusBanner(
              icon: Icons.hourglass_empty_rounded,
              title: 'KYC Under Review',
              subtitle: 'Documents are being audited by our legal compliance team. Approval is typically instant.',
              color: Colors.orange,
              isDark: isDark,
            )
          else
            _buildStatusBanner(
              icon: Icons.info_outline_rounded,
              title: 'Pending Submission',
              subtitle: 'Felbic compliance rules require an official Government ID record (e.g. PAN Card, Aadhaar Card, or Passport) to prevent duplicate profiles and trigger payouts.',
              color: Colors.blue,
              isDark: isDark,
            ),
            
          AppSpacing.gapLG,

          if (!kycVerified)
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
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      width: 0.8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('KYC UPLOAD WIZARD',
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                            letterSpacing: 0.5)),
                    AppSpacing.gapMD,
                    TextFormField(
                      controller: _nameController,
                      style: const TextStyle(fontSize: 12.5),
                      decoration: const InputDecoration(
                        labelText: 'Legal Name (As on ID card)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
                        isDense: true,
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Legal name is required' : null,
                    ),
                    AppSpacing.gapMD,
                    DropdownButtonFormField<String>(
                      value: _selectedDocumentType,
                      decoration: const InputDecoration(
                        labelText: 'ID Document Type',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
                        isDense: true,
                      ),
                      items: _documentTypes.map((type) {
                        return DropdownMenuItem<String>(
                          value: type,
                          child: Text(type, style: const TextStyle(fontSize: 12.5)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedDocumentType = val;
                          });
                        }
                      },
                    ),
                    AppSpacing.gapMD,
                    // Mock file uploader
                    GestureDetector(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Document image selected (mock).'), behavior: SnackBarBehavior.floating),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.withOpacity(0.5), style: BorderStyle.solid),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.upload_file_rounded, size: 16, color: Colors.grey),
                            SizedBox(width: 4),
                            Text('Select ID Photo File', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                    AppSpacing.gapLG,
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          minimumSize: const Size.fromHeight(42),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
                      onPressed: _isSubmitting || kycUploaded ? null : _submitKYC,
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2))
                          : Text(kycUploaded ? 'Documents Under Review' : 'Submit Verification Logs',
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusBanner({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required bool isDark,
  }) {
    final bgColor = color.withOpacity(isDark ? 0.08 : 0.05);
    final borderColor = color.withOpacity(0.2);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.rMD,
        border: Border.all(color: borderColor, width: 0.8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          AppSpacing.gapSM,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(color: Colors.grey, fontSize: 10, height: 1.4)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
