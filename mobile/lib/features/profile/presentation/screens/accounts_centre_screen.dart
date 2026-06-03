import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import 'personal_details_screen.dart';
import 'password_security_screen.dart';
import 'wallet_payments_screen.dart';
import 'email_settings_screen.dart';
import 'kyc_verification_screen.dart';
import 'delete_account_screen.dart';

class AccountsCentreScreen extends StatelessWidget {
  final bool isCreatorMode;
  const AccountsCentreScreen({super.key, required this.isCreatorMode});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: const Text('accounts centre',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          const Text(
            'Manage your connected credentials, profile security keys, verification badges and subscription wallets.',
            style: TextStyle(color: Colors.grey, fontSize: 11, height: 1.4),
          ),
          AppSpacing.gapLG,
          _buildTile(context, Icons.security_rounded, 'Password and security',
              'Reset passwords, 2-factor authentication setup', isDark, () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const PasswordSecurityScreen()));
          }),
          _buildTile(context, Icons.person_pin_rounded, 'Personal details',
              'Edit username, display name, location, bio, avatar, cover banner', isDark, () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) =>
                        PersonalDetailsScreen(isCreatorMode: isCreatorMode)));
          }),
          _buildTile(context, Icons.mail_outline_rounded, 'Email settings',
              'Change or update your verified email address', isDark, () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const EmailSettingsScreen()));
          }),
          if (isCreatorMode)
            _buildTile(context, Icons.verified_user_rounded, 'Identity verification',
                'Verify identity for payouts and verified badges', isDark, () {
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const KycVerificationScreen()));
            }),
          _buildTile(
              context,
              Icons.credit_card_rounded,
              'Wallets & payments',
              'Manage cards, deposit wallet funds, check bank details',
              isDark, () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const WalletPaymentsScreen()));
          }),
          _buildTile(context, Icons.history_rounded, 'Account activity',
              'Audited log of active logins and sessions', isDark, () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const PasswordSecurityScreen()));
          }),
          _buildTile(context, Icons.delete_forever_rounded, 'Delete account',
              'Permanently erase your account and profile data', isDark, () {
            Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const DeleteAccountScreen()));
          }),
        ],
      ),
    );
  }

  Widget _buildTile(BuildContext context, IconData icon, String title,
      String subtitle, bool isDark, VoidCallback onTap) {
    final tileColor = isDark
        ? AppColors.darkBorder.withOpacity(0.1)
        : AppColors.lightBorder.withOpacity(0.1);
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
          borderRadius: AppRadius.rMD, side: BorderSide(color: borderColor)),
      color: tileColor,
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ListTile(
        dense: true,
        leading: Icon(icon, size: 20),
        title: Text(title,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 9.5)),
        trailing: const Icon(Icons.chevron_right_rounded, size: 16),
        onTap: onTap,
      ),
    );
  }
}
