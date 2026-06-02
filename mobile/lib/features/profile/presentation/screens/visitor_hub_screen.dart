import 'package:flutter/material.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../explore/presentation/screens/explore_screen.dart';
import '../../../wallet/presentation/screens/wallet_screen.dart';
import 'saved_collections_screen.dart';
import '../widgets/dashboard_widgets.dart';
import '../widgets/unlocked_media_grid.dart';

class VisitorHubScreen extends StatelessWidget {
  const VisitorHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final success = isDark ? AppColors.darkSuccess : AppColors.lightSuccess;

    return AnimatedBuilder(
      animation: DemoAppState.instance,
      builder: (context, _) {
        final state = DemoAppState.instance;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Visitor Hub'),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          body: ListView(
            padding: AppSpacing.pAllMD,
            children: [
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: AppSpacing.sm,
                crossAxisSpacing: AppSpacing.sm,
                childAspectRatio: 1.25,
                children: [
                  MetricCard(
                    label: 'Wallet balance',
                    value:
                        'Rs ${(state.fanBalance / 1000).toStringAsFixed(1)}K',
                    icon: Icons.account_balance_wallet_rounded,
                    accent: success,
                  ),
                  MetricCard(
                    label: 'Unlocked',
                    value: '${state.purchasedMedia.length}',
                    icon: Icons.lock_open_rounded,
                  ),
                  MetricCard(
                    label: 'Saved posts',
                    value: '${state.savedPostIds.length}',
                    icon: Icons.bookmark_rounded,
                  ),
                  MetricCard(
                    label: 'Subscriptions',
                    value: '${state.subscribedCreators.length + 3}',
                    icon: Icons.verified_user_rounded,
                  ),
                ],
              ),
              AppSpacing.gapLG,
              DashboardSection(
                title: 'Quick Actions',
                children: [
                  ActionTile(
                    icon: Icons.explore_rounded,
                    title: 'Discover creators',
                    subtitle: 'Find new verified creators and categories',
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ExploreScreen())),
                  ),
                  ActionTile(
                    icon: Icons.add_card_rounded,
                    title: 'Add wallet funds',
                    subtitle:
                        'Top up credits for unlocks, tips, and subscriptions',
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const WalletScreen())),
                  ),
                  ActionTile(
                    icon: Icons.bookmark_rounded,
                    title: 'Saved collection',
                    subtitle: 'Private saved posts and locked previews',
                    badge: '${state.savedPostIds.length}',
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const SavedCollectionsScreen())),
                  ),
                ],
              ),
              DashboardSection(
                title: 'Subscriptions',
                children: [
                  ActionTile(
                    icon: Icons.person_rounded,
                    title: 'lucia_fit',
                    subtitle: 'VIP tier - renews June 30, 2026',
                    badge: 'VIP',
                    onTap: () => _showSheet(context, 'lucia_fit subscription', [
                      'Tier: VIP',
                      'Monthly rate: Rs 399',
                      'Benefits: locked feed, chat replies, polls',
                    ]),
                  ),
                  ActionTile(
                    icon: Icons.palette_rounded,
                    title: 'alexandra_art',
                    subtitle: 'Superfan tier - alerts enabled',
                    badge: 'alerts',
                    onTap: () =>
                        _showSheet(context, 'alexandra_art subscription', [
                      'Tier: Superfan',
                      'Last unlock: digital canvas trailer',
                      'Alerts: enabled',
                    ]),
                  ),
                ],
              ),
              DashboardSection(
                title: 'Spending Analytics',
                trailing: TextButton(
                    onPressed: () {}, child: const Text('This month')),
                children: const [
                  MiniBarChart(
                    values: [4, 8, 3, 10, 7, 12, 6],
                    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                  ),
                  ActivityRow(
                    icon: Icons.savings_rounded,
                    title: 'Budget healthy',
                    subtitle: 'Rs 2,100 below your monthly unlock budget',
                    positive: true,
                  ),
                ],
              ),
              DashboardSection(
                title: 'Unlocked Gallery Preview',
                children: const [
                  UnlockedMediaGrid(),
                ],
              ),
              DashboardSection(
                title: 'Recent Activity',
                children: const [
                  ActivityRow(
                    icon: Icons.lock_open_rounded,
                    title: 'Unlocked travel BTS set',
                    subtitle: 'Added to unlocked gallery',
                    positive: true,
                  ),
                  ActivityRow(
                    icon: Icons.chat_bubble_rounded,
                    title: 'Creator replied to your message',
                    subtitle: 'Open chats to continue',
                  ),
                  ActivityRow(
                    icon: Icons.notifications_active_rounded,
                    title: 'New VIP post alert',
                    subtitle: 'lucia_fit posted premium tutorial',
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSheet(BuildContext context, String title, List<String> rows) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: AppSpacing.pAllMD,
          children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            AppSpacing.gapSM,
            ...rows.map((row) => ListTile(
                  leading: const Icon(Icons.check_circle_outline_rounded),
                  title: Text(row),
                )),
          ],
        ),
      ),
    );
  }
}
