import 'package:flutter/material.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../feed/presentation/screens/create_post_screen.dart';
import '../../../chat/presentation/screens/chat_list_screen.dart';
import 'payout_setup_screen.dart';
import 'subscription_tiers_screen.dart';
import '../widgets/dashboard_widgets.dart';

class CreatorHubScreen extends StatelessWidget {
  const CreatorHubScreen({super.key});

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
            title: const Text('Creator Hub'),
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
                    label: 'Earnings',
                    value:
                        'Rs ${(state.creatorEarnings / 1000).toStringAsFixed(1)}K',
                    delta: '+12%',
                    icon: Icons.payments_rounded,
                    accent: success,
                  ),
                  const MetricCard(
                    label: 'Subscribers',
                    value: '190',
                    delta: '+8',
                    icon: Icons.group_rounded,
                  ),
                  const MetricCard(
                    label: 'Unlock rate',
                    value: '31%',
                    delta: '+4%',
                    icon: Icons.lock_open_rounded,
                  ),
                  const MetricCard(
                    label: 'Messages',
                    value: '24',
                    delta: '6 hot',
                    icon: Icons.mark_chat_unread_rounded,
                  ),
                ],
              ),
              AppSpacing.gapLG,
              DashboardSection(
                title: 'Response Queue',
                children: [
                  ActionTile(
                    icon: Icons.chat_bubble_rounded,
                    title: 'Fan messages',
                    subtitle: '6 unanswered, 2 paid media requests',
                    badge: '6',
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ChatListScreen())),
                  ),
                  ActionTile(
                    icon: Icons.auto_awesome_rounded,
                    title: 'Custom content requests',
                    subtitle: 'Review briefs, price, and delivery windows',
                    badge: '3',
                    onTap: () => _showSheet(context, 'Custom requests', [
                      'Yoga tutorial request - Rs 1,299 offer',
                      'Raw layer pack request - waiting for quote',
                      'Travel BTS set - deliver by Friday',
                    ]),
                  ),
                ],
              ),
              DashboardSection(
                title: 'Money & Payouts',
                children: [
                  ActionTile(
                    icon: Icons.account_balance_rounded,
                    title: 'Payout center',
                    subtitle: state.isBankConnected
                        ? 'Bank connected: ${state.bankName}'
                        : 'Connect bank and request payout',
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const PayoutSetupScreen())),
                  ),
                  ActionTile(
                    icon: Icons.workspace_premium_rounded,
                    title: 'Subscription tiers',
                    subtitle:
                        'Current VIP rate Rs ${state.creatorSubscriptionPrice.round()}/mo',
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const SubscriptionTiersScreen())),
                  ),
                ],
              ),
              DashboardSection(
                title: 'Analytics',
                trailing:
                    TextButton(onPressed: () {}, child: const Text('30 days')),
                children: const [
                  MiniBarChart(
                    values: [22, 28, 19, 36, 42, 34, 48],
                    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                  ),
                  ActivityRow(
                    icon: Icons.trending_up_rounded,
                    title: 'Best post: Travel vlog preview',
                    subtitle: 'Unlocked 42 times from 136 views',
                    positive: true,
                  ),
                  ActivityRow(
                    icon: Icons.touch_app_rounded,
                    title: 'Top CTA: Message tip',
                    subtitle: 'Fans tapped tip after chat preview 18 times',
                  ),
                ],
              ),
              DashboardSection(
                title: 'Content Tools',
                children: [
                  ActionTile(
                    icon: Icons.add_box_rounded,
                    title: 'Create paid post',
                    subtitle: 'Photo/video, poll, tiers, schedule, watermark',
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const CreatePostScreen())),
                  ),
                  ActionTile(
                    icon: Icons.campaign_rounded,
                    title: 'Mass message',
                    subtitle: 'Send PPV teaser to subscribers',
                    onTap: () => _showSheet(context, 'Mass message', [
                      'Audience: VIP + Superfans',
                      'Attachment: premium trailer',
                      'Price suggestion: Rs 699',
                    ]),
                  ),
                ],
              ),
              DashboardSection(
                title: 'Recent Activity',
                children: const [
                  ActivityRow(
                    icon: Icons.lock_open_rounded,
                    title: 'premium_clicks unlocked your post',
                    subtitle: 'Rs 799 added to pending earnings',
                    positive: true,
                  ),
                  ActivityRow(
                    icon: Icons.person_add_alt_1_rounded,
                    title: '3 new subscribers joined',
                    subtitle: 'VIP tier grew 12% this week',
                    positive: true,
                  ),
                  ActivityRow(
                    icon: Icons.report_outlined,
                    title: 'Moderation queue clear',
                    subtitle: 'No flagged messages currently open',
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
