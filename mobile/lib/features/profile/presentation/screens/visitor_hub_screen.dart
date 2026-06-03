import 'package:flutter/material.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../explore/presentation/screens/explore_screen.dart';
import '../../../wallet/presentation/screens/wallet_screen.dart';
import '../widgets/dashboard_widgets.dart';

class VisitorHubScreen extends StatefulWidget {
  const VisitorHubScreen({super.key});

  @override
  State<VisitorHubScreen> createState() => _VisitorHubScreenState();
}

class _VisitorHubScreenState extends State<VisitorHubScreen> {
  bool _isLoading = true;
  double _balance = 0;
  int _savedCount = 0;
  int _unlockedCount = 0;
  List<Map<String, dynamic>> _subscriptions = [];
  List<Map<String, dynamic>> _transactions = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      await Future.wait([
        _loadWallet(),
        _loadSubscriptions(),
        _loadBookmarks(),
      ]);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadWallet() async {
    try {
      final response = await getIt<ApiClient>().get('/wallet');
      final data = Map<String, dynamic>.from(response.data as Map);
      if (!mounted) return;
      setState(() {
        _balance = ((data['balance'] ?? 0) as num).toDouble();
        final txns = data['transactions'] is List
            ? (data['transactions'] as List)
            : <dynamic>[];
        _transactions = txns
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _unlockedCount = _transactions
            .where((t) =>
                (t['type']?.toString() ?? '') == 'unlock' ||
                (t['title']?.toString() ?? '').toLowerCase().contains('unlock'))
            .length;
      });
    } catch (e) {
      debugPrint('VisitorHub: wallet load error: $e');
    }
  }

  Future<void> _loadSubscriptions() async {
    try {
      final response = await getIt<ApiClient>().get('/users/subscriptions');
      final data = response.data;
      List<dynamic> subs = [];
      if (data is List) {
        subs = data;
      } else if (data is Map && data['subscriptions'] is List) {
        subs = data['subscriptions'] as List;
      }
      if (!mounted) return;
      setState(() {
        _subscriptions = subs
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      });
    } catch (e) {
      debugPrint('VisitorHub: subscriptions load error: $e');
    }
  }

  Future<void> _loadBookmarks() async {
    try {
      final response = await getIt<ApiClient>().get('/posts/bookmarks');
      final List<dynamic> raw = response.data is List
          ? response.data as List
          : (response.data['posts'] ?? []) as List;
      if (!mounted) return;
      setState(() {
        _savedCount = raw.length;
      });
    } catch (e) {
      debugPrint('VisitorHub: bookmarks load error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final success = isDark ? AppColors.darkSuccess : AppColors.lightSuccess;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Visitor Hub'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: AppSpacing.pAllMD,
                children: [
                  // Metric cards
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
                        value: 'Rs ${_balance.toStringAsFixed(2)}',
                        icon: Icons.account_balance_wallet_rounded,
                        accent: success,
                      ),
                      MetricCard(
                        label: 'Unlocked',
                        value: '$_unlockedCount',
                        icon: Icons.lock_open_rounded,
                      ),
                      MetricCard(
                        label: 'Saved posts',
                        value: '$_savedCount',
                        icon: Icons.bookmark_rounded,
                      ),
                      MetricCard(
                        label: 'Subscriptions',
                        value: '${_subscriptions.length}',
                        icon: Icons.verified_user_rounded,
                      ),
                    ],
                  ),
                  AppSpacing.gapLG,

                  // Quick Actions
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
                    ],
                  ),

                  // Active Subscriptions
                  if (_subscriptions.isNotEmpty)
                    DashboardSection(
                      title: 'Active Subscriptions',
                      children: _subscriptions.map((sub) {
                        final creatorUsername =
                            sub['username']?.toString() ?? 'Creator';
                        final expiresAt =
                            sub['expires_at']?.toString() ?? '';
                        String expiryText = '';
                        if (expiresAt.isNotEmpty) {
                          try {
                            final dt = DateTime.parse(expiresAt).toLocal();
                            expiryText =
                                'Renews ${dt.day}/${dt.month}/${dt.year}';
                          } catch (_) {
                            expiryText = 'Active subscription';
                          }
                        }
                        return ActionTile(
                          icon: Icons.person_rounded,
                          title: '@$creatorUsername',
                          subtitle: expiryText.isNotEmpty
                              ? expiryText
                              : 'Active subscription',
                          badge: 'VIP',
                          onTap: () => _showSubSheet(context, sub),
                        );
                      }).toList(),
                    )
                  else
                    DashboardSection(
                      title: 'Subscriptions',
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              vertical: AppSpacing.md),
                          child: Center(
                            child: Text(
                              'No active subscriptions yet.\nDiscover creators and subscribe to unlock exclusive content.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? AppColors.darkTextMuted
                                    : AppColors.lightTextMuted,
                                height: 1.5,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                  // Recent Activity (from real transaction log)
                  if (_transactions.isNotEmpty)
                    DashboardSection(
                      title: 'Recent Activity',
                      children: _transactions.take(5).map((tx) {
                        final amount =
                            ((tx['amount'] ?? 0) as num).toDouble();
                        final title =
                            tx['title']?.toString() ?? 'Transaction';
                        final isAdd = amount >= 0;
                        return ActivityRow(
                          icon: isAdd
                              ? Icons.arrow_downward_rounded
                              : Icons.arrow_upward_rounded,
                          title: title,
                          subtitle: 'Rs ${amount.abs().toStringAsFixed(2)}',
                          positive: isAdd,
                        );
                      }).toList(),
                    )
                  else
                    DashboardSection(
                      title: 'Recent Activity',
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              vertical: AppSpacing.md),
                          child: Center(
                            child: Text(
                              'No wallet activity yet.',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? AppColors.darkTextMuted
                                    : AppColors.lightTextMuted,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
    );
  }

  void _showSubSheet(BuildContext context, Map<String, dynamic> sub) {
    final creatorUsername = sub['username']?.toString() ?? 'Creator';
    final subPrice = sub['price']?.toString() ?? sub['subPrice']?.toString() ?? 'N/A';
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: AppSpacing.pAllMD,
          children: [
            Text('@$creatorUsername subscription',
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            AppSpacing.gapSM,
            ListTile(
              leading: const Icon(Icons.check_circle_outline_rounded),
              title: const Text('Monthly rate'),
              subtitle: Text('Rs $subPrice'),
            ),
            ListTile(
              leading: const Icon(Icons.check_circle_outline_rounded),
              title: const Text('Status'),
              subtitle: Text(sub['status']?.toString() ?? 'active'),
            ),
          ],
        ),
      ),
    );
  }
}

