import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/cubit/theme_cubit.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import 'accounts_centre_screen.dart';
import '../widgets/settings_tile.dart';
import 'blocked_users_screen.dart';
import 'saved_collections_screen.dart';
import 'payout_setup_screen.dart';
import 'subscription_tiers_screen.dart';
import 'creator_hub_screen.dart';
import 'visitor_hub_screen.dart';

class SettingsScreen extends StatelessWidget {
  final bool isCreatorMode;
  const SettingsScreen({super.key, required this.isCreatorMode});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('settings and activity',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md, vertical: AppSpacing.sm),
        children: [
          _buildSearch(isDark),
          AppSpacing.gapLG,
          _buildHeader('your account'),
          SettingsTile(
            icon: Icons.account_circle_rounded,
            title: 'Accounts Centre',
            subtitle: 'password, security, personal details, payments',
            isDark: isDark,
            primaryColor: primary,
            onTap: () => _openAccounts(context),
          ),
          AppSpacing.gapLG,
          _buildHeader('how you use felbic'),
          SettingsTile(
            icon: isCreatorMode
                ? Icons.dashboard_customize_rounded
                : Icons.auto_awesome_rounded,
            title: isCreatorMode ? 'Creator Hub' : 'Visitor Hub',
            subtitle: isCreatorMode
                ? 'responses, analytics, money and activity'
                : 'subscriptions, spending, unlocked media and activity',
            isDark: isDark,
            primaryColor: primary,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => isCreatorMode
                    ? const CreatorHubScreen()
                    : const VisitorHubScreen(),
              ),
            ),
          ),
          SettingsTile(
            icon: Icons.bookmark_rounded,
            title: 'Saved',
            subtitle: 'your private collection of saved posts',
            isDark: isDark,
            primaryColor: primary,
            onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const SavedCollectionsScreen())),
          ),
          SettingsTile(
            icon: Icons.block_rounded,
            title: 'Blocked',
            subtitle: 'manage blocked creators and restrictions',
            isDark: isDark,
            primaryColor: primary,
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const BlockedUsersScreen())),
          ),
          _buildThemeToggle(context, isDark, primary),
          AppSpacing.gapLG,
          if (isCreatorMode) ...[
            _buildHeader('creator resources'),
            SettingsTile(
              icon: Icons.account_balance_wallet_rounded,
              title: 'Payout Setup & Billing',
              subtitle: 'bank transfers and payout schedule',
              isDark: isDark,
              primaryColor: primary,
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const PayoutSetupScreen())),
            ),
            SettingsTile(
              icon: Icons.verified_user_rounded,
              title: 'Subscription Tiers & Rates',
              subtitle: 'configure monthly fees and subscriber benefits',
              isDark: isDark,
              primaryColor: primary,
              onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const SubscriptionTiersScreen())),
            ),
            AppSpacing.gapLG,
          ],
          _buildHeader('more info'),
          SettingsTile(
            icon: Icons.help_outline_rounded,
            title: 'Help Center',
            subtitle: 'FAQs, tutorials and support tickets',
            isDark: isDark,
            primaryColor: primary,
            onTap: () {},
          ),
          Center(
            child: TextButton(
              onPressed: () => _showLogoutConfirmation(context, isDark),
              child: const Text('log out',
                  style: TextStyle(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                      fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearch(bool isDark) {
    return Container(
      height: 38,
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBorder.withOpacity(0.12)
            : AppColors.lightBorder.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            width: 0.8),
      ),
      child: const TextField(
        style: TextStyle(fontSize: 12),
        decoration: InputDecoration(
          hintText: 'search settings...',
          hintStyle: TextStyle(fontSize: 11.5, color: Colors.grey),
          prefixIcon: Icon(Icons.search_rounded, size: 16, color: Colors.grey),
          border: InputBorder.none,
          isDense: true,
          contentPadding: EdgeInsets.symmetric(vertical: 8),
        ),
      ),
    );
  }

  Widget _buildHeader(String text) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
        child: Text(text.toLowerCase(),
            style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
                letterSpacing: 0.5)),
      );

  Widget _buildThemeToggle(BuildContext context, bool isDark, Color primary) {
    return BlocBuilder<ThemeCubit, ThemeMode>(
      builder: (context, mode) {
        final activeDark = mode == ThemeMode.dark ||
            (mode == ThemeMode.system &&
                WidgetsBinding.instance.platformDispatcher.platformBrightness ==
                    Brightness.dark);
        return SwitchListTile(
          title: const Text('dark mode theme',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          subtitle: const Text('toggle between dark and light appearance',
              style: TextStyle(fontSize: 9.5)),
          value: activeDark,
          activeColor: primary,
          dense: true,
          onChanged: (val) => context.read<ThemeCubit>().toggleTheme(),
        );
      },
    );
  }

  void _openAccounts(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => AccountsCentreScreen(isCreatorMode: isCreatorMode)),
    );
  }

  void _showLogoutConfirmation(BuildContext context, bool isDark) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, anim1, anim2) => Container(),
      transitionBuilder: (context, anim1, anim2, child) {
        final scale = Tween<double>(begin: 0.9, end: 1.0).animate(
          CurvedAnimation(parent: anim1, curve: Curves.easeOutBack),
        );
        final opacity = Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(parent: anim1, curve: Curves.easeIn),
        );
        return ScaleTransition(
          scale: scale,
          child: FadeTransition(
            opacity: opacity,
            child: AlertDialog(
              shape: const RoundedRectangleBorder(borderRadius: AppRadius.rMD),
              title: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              content: const Text(
                'Are you sure you want to log out of your session on Felbic?',
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'Cancel',
                    style: TextStyle(
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Simulated Logout: returning to guest session...'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  child: const Text(
                    'Log Out',
                    style: TextStyle(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
