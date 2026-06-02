import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../screens/personal_details_screen.dart';
import '../screens/password_security_screen.dart';
import '../screens/wallet_payments_screen.dart';

class AccountsCentreSheet extends StatelessWidget {
  final bool isCreatorMode;
  const AccountsCentreSheet({super.key, required this.isCreatorMode});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => SingleChildScrollView(
        controller: scrollController,
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  borderRadius: AppRadius.rFull,
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Accounts Centre',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            AppSpacing.gapSM,
            const Text(
              'Manage your connected credentials, profile security keys, verification badges and subscription wallets.',
              style: TextStyle(color: Colors.grey, fontSize: 11, height: 1.4),
            ),
            AppSpacing.gapLG,
            _buildTile(Icons.security_rounded, 'Password and security',
                'Reset passwords, 2-factor authentication setup', isDark, () {
              Navigator.pop(context);
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const PasswordSecurityScreen()));
            }),
            _buildTile(
                Icons.person_pin_rounded,
                'Personal details',
                'Email addresses, backup numbers, account ownership',
                isDark, () {
              Navigator.pop(context);
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) =>
                          PersonalDetailsScreen(isCreatorMode: isCreatorMode)));
            }),
            _buildTile(
                Icons.credit_card_rounded,
                'Wallets & payments',
                'Manage cards, deposit wallet funds, check bank details',
                isDark, () {
              Navigator.pop(context);
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const WalletPaymentsScreen()));
            }),
            _buildTile(Icons.history_rounded, 'Account activity',
                'Audited log of active logins and sessions', isDark, () {
              Navigator.pop(context);
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const PasswordSecurityScreen()));
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildTile(IconData icon, String title, String subtitle, bool isDark,
      VoidCallback onTap) {
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
