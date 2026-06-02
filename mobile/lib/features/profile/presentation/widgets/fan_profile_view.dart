import 'package:flutter/material.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../screens/settings_screen.dart';
import '../screens/visitor_hub_screen.dart';
import '../screens/wallet_payments_screen.dart';
import 'package:feebic_mobile/features/shared/widgets/user_avatar.dart';
import 'perspective_toggle.dart';
import 'unlocked_media_grid.dart';
import 'saved_posts_grid.dart';

class FanProfileView extends StatefulWidget {
  const FanProfileView({super.key});

  @override
  State<FanProfileView> createState() => _FanProfileViewState();
}

class _FanProfileViewState extends State<FanProfileView> {
  bool _showSavedTab = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return AnimatedBuilder(
      animation: DemoAppState.instance,
      builder: (context, _) {
        final state = DemoAppState.instance;
        return Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                const Icon(Icons.account_circle_rounded, size: 22),
                AppSpacing.gapXS,
                Text(state.fanUsername,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            actions: [
              const PerspectiveToggle(),
              IconButton(
                icon: const Icon(Icons.menu_rounded, size: 24),
                onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            const SettingsScreen(isCreatorMode: false))),
              ),
            ],
          ),
          body: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Row(
                  children: [
                    UserAvatar(imageUrl: state.fanAvatar, radius: 36),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildStatColumn('3', 'Subscribed', isDark),
                          _buildStatColumn('${state.purchasedMedia.length}',
                              'Unlocked', isDark),
                          _buildStatColumn(
                              'Rs ${state.fanBalance.toStringAsFixed(2)}',
                              'Balance',
                              isDark),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(state.fanName,
                        style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    AppSpacing.gapXXS,
                    Text(state.fanBio,
                        style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? AppColors.darkTextMain
                                : AppColors.lightTextMain,
                            height: 1.3)),
                    AppSpacing.gapXS,
                    Text('felbic.me/${state.fanUsername}',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: primaryColor)),
                  ],
                ),
              ),
              AppSpacing.gapMD,
              _buildActions(context),
              AppSpacing.gapLG,
              const Divider(height: 1),
              _buildTabs(isDark, primaryColor),
              AppSpacing.gapMD,
              _showSavedTab
                  ? const SavedPostsGrid()
                  : const UnlockedMediaGrid(),
              const SizedBox(height: 30),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatColumn(String count, String label, bool isDark) {
    return Column(
      children: [
        Text(count,
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color:
                    isDark ? AppColors.darkTextMain : AppColors.lightTextMain)),
        AppSpacing.gapXXS,
        Text(label,
            style: TextStyle(
                fontSize: 11,
                color: isDark
                    ? AppColors.darkTextMuted
                    : AppColors.lightTextMuted)),
      ],
    );
  }

  Widget _buildActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        children: [
          Expanded(
              child: OutlinedButton(
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const VisitorHubScreen())),
                  child: const Text('Visitor Hub'))),
          AppSpacing.gapSM,
          Expanded(
              child: OutlinedButton(
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const WalletPaymentsScreen())),
                  child: const Text('Wallet Settings'))),
        ],
      ),
    );
  }

  Widget _buildTabs(bool isDark, Color primaryColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        children: [
          _buildTabButton(false, Icons.grid_on_rounded, 'unlocked feed', isDark,
              primaryColor),
          _buildTabButton(true, Icons.bookmark_rounded, 'saved collection',
              isDark, primaryColor),
        ],
      ),
    );
  }

  Widget _buildTabButton(bool forSaved, IconData icon, String label,
      bool isDark, Color primaryColor) {
    final active = _showSavedTab == forSaved;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _showSavedTab = forSaved),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
              border: Border(
                  bottom: BorderSide(
                      color: active ? primaryColor : Colors.transparent,
                      width: 2.0))),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: active ? primaryColor : Colors.grey),
              const SizedBox(width: 6),
              Text(label,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: active
                          ? (isDark ? Colors.white : Colors.black)
                          : Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }

  void _showActionSheet(BuildContext context, String action) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: AppSpacing.pAllMD,
          children: [
            Text(action,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            AppSpacing.gapSM,
            ListTile(
              leading: const Icon(Icons.person_outline_rounded),
              title: const Text('Profile details'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context)
                    .showSnackBar(SnackBar(content: Text('$action saved.')));
              },
            ),
          ],
        ),
      ),
    );
  }
}
