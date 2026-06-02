import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  // Fan state variables
  final List<Map<String, dynamic>> _paymentMethods = <Map<String, dynamic>>[
    {
      'title': 'Visa ending in 4242',
      'subtitle': 'Expires 12/28',
      'icon': Icons.credit_card_rounded
    },
    {
      'title': 'Apple Pay',
      'subtitle': 'Default method',
      'icon': Icons.apple_rounded
    },
  ];

  void _showCustomGeneralDialog({
    required BuildContext context,
    required String title,
    required Widget content,
    required List<Widget> actions,
  }) {
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
              title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              content: content,
              actions: actions,
            ),
          ),
        );
      },
    );
  }

  void _showSuccessOverlay(BuildContext context, String message) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: isDark ? Colors.black87 : Colors.white.withOpacity(0.9),
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (context, anim1, anim2) => Container(),
      transitionBuilder: (context, anim1, anim2, child) {
        final scale = Tween<double>(begin: 0.5, end: 1.0).animate(
          CurvedAnimation(parent: anim1, curve: Curves.easeOutBack),
        );
        final opacity = Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(parent: anim1, curve: Curves.easeIn),
        );

        Future.delayed(const Duration(milliseconds: 1800), () {
          if (context.mounted) {
            Navigator.of(context, rootNavigator: true).pop();
          }
        });

        return FadeTransition(
          opacity: opacity,
          child: ScaleTransition(
            scale: scale,
            child: Center(
              child: Card(
                elevation: 0,
                color: Colors.transparent,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: (isDark ? AppColors.darkSuccess : AppColors.lightSuccess).withOpacity(0.12),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        Icons.check_rounded,
                        color: isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
                        size: 40,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Success!',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: isDark ? AppColors.darkTextMain : AppColors.lightTextMain,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        message,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _showAddFundsDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final controller = TextEditingController();
    _showCustomGeneralDialog(
      context: context,
      title: 'Add Funds',
      content: TextField(
        controller: controller,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: const InputDecoration(
          hintText: 'Enter deposit amount (e.g. 1000.00)',
          prefixText: 'Rs ',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancel',
            style: TextStyle(
                color: isDark
                    ? AppColors.darkTextMuted
                    : AppColors.lightTextMuted),
          ),
        ),
        TextButton(
          onPressed: () {
            final amount = double.tryParse(controller.text.trim());
            if (amount != null && amount > 0) {
              setState(() {
                DemoAppState.instance.addFunds(amount);
              });
              Navigator.pop(context);
              _showSuccessOverlay(context, 'Deposited Rs ${amount.toStringAsFixed(2)} successfully!');
            }
          },
          child: Text(
            'Deposit',
            style: TextStyle(
              color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  void _showRequestPayoutDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final controller = TextEditingController();
    _showCustomGeneralDialog(
      context: context,
      title: 'Request Payout',
      content: TextField(
        controller: controller,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: const InputDecoration(
          hintText: 'Enter amount to withdraw',
          prefixText: 'Rs ',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancel',
            style: TextStyle(
                color: isDark
                    ? AppColors.darkTextMuted
                    : AppColors.lightTextMuted),
          ),
        ),
        TextButton(
          onPressed: () {
            final amount = double.tryParse(controller.text.trim());
            if (amount != null &&
                DemoAppState.instance.requestPayout(amount)) {
              setState(() {});
              Navigator.pop(context);
              _showSuccessOverlay(context, 'Payout request of Rs ${amount.toStringAsFixed(2)} submitted!');
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content:
                      const Text('Invalid amount or insufficient balance.'),
                  backgroundColor:
                      isDark ? AppColors.darkAccent : AppColors.lightAccent,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
          child: Text(
            'Request',
            style: TextStyle(
              color: isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  void _showAddPaymentMethodDialog(BuildContext context) {
    final controller = TextEditingController();
    _showCustomGeneralDialog(
      context: context,
      title: 'Add Payment Method',
      content: TextField(
        controller: controller,
        decoration: const InputDecoration(
            hintText: 'Card label, e.g. Mastercard ending in 8080'),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel')),
        TextButton(
          onPressed: () {
            final label = controller.text.trim();
            if (label.isEmpty) return;
            setState(() {
              _paymentMethods.add({
                'title': label,
                'subtitle': 'Ready to use',
                'icon': Icons.credit_card_rounded
              });
            });
            Navigator.pop(context);
            _showSuccessOverlay(context, 'Payment method added: $label');
          },
          child: const Text('Save'),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserModeCubit, UserMode>(
      builder: (context, mode) {
        if (mode == UserMode.creator) {
          return _buildCreatorWallet(context);
        } else {
          return _buildFanWallet(context);
        }
      },
    );
  }

  // --- FAN (VISITOR) WALLET ---
  Widget _buildFanWallet(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AnimatedBuilder(
        animation: DemoAppState.instance,
        builder: (context, _) => Scaffold(
              appBar: AppBar(
                title: const Text('My Wallet',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ),
              body: ListView(
                padding: AppSpacing.pAllMD,
                children: [
                  _buildGradientBalanceCard(
                    title: 'Available Credits',
                    amount:
                        'Rs ${DemoAppState.instance.fanBalance.toStringAsFixed(2)}',
                    buttonLabel: 'Add Funds',
                    onPressed: () => _showAddFundsDialog(context),
                  ),
                  AppSpacing.gapLG,
                  const Text(
                    'Payment Methods',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  AppSpacing.gapSM,
                  ..._paymentMethods.map((method) => _buildPaymentMethodTile(
                        context,
                        title: method['title'] as String,
                        subtitle: method['subtitle'] as String,
                        icon: method['icon'] as IconData,
                        isDark: isDark,
                      )),
                  OutlinedButton.icon(
                    onPressed: () => _showAddPaymentMethodDialog(context),
                    icon: const Icon(Icons.add_card_rounded, size: 18),
                    label: const Text('Add Payment Method'),
                  ),
                  AppSpacing.gapLG,
                  const Text(
                    'Recent Transactions',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  AppSpacing.gapSM,
                  ...DemoAppState.instance.fanTransactions
                      .map((tx) => _buildTransactionItem(
                            context,
                            description: tx.description,
                            amount:
                                '${tx.amount >= 0 ? '+' : '-'}Rs ${tx.amount.abs().toStringAsFixed(2)}',
                            date: tx.date,
                            isAdd: tx.isAdd,
                            isDark: isDark,
                          )),
                ],
              ),
            ));
  }

  // --- CREATOR REVENUE WALLET ---
  Widget _buildCreatorWallet(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AnimatedBuilder(
        animation: DemoAppState.instance,
        builder: (context, _) => Scaffold(
              appBar: AppBar(
                title: const Text('Earnings',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ),
              body: ListView(
                padding: AppSpacing.pAllMD,
                children: [
                  _buildGradientBalanceCard(
                    title: 'Current Earnings Balance',
                    amount:
                        'Rs ${DemoAppState.instance.creatorEarnings.toStringAsFixed(2)}',
                    buttonLabel: 'Request Payout',
                    onPressed: () => _showRequestPayoutDialog(context),
                    isCreator: true,
                  ),
                  AppSpacing.gapLG,
                  const Text(
                    'Revenue Breakdown',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  AppSpacing.gapSM,
                  _buildRevenueSplitRow(context, 'Subscription Fees',
                      'Rs 84,000.00', '59% of total', isDark),
                  _buildRevenueSplitRow(context, 'Post Unlocks (PPV)',
                      'Rs 42,450.00', '30% of total', isDark),
                  _buildRevenueSplitRow(context, 'Tips from Chat',
                      'Rs 16,000.00', '11% of total', isDark),
                  AppSpacing.gapLG,
                  const Text(
                    'Payout Status',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  AppSpacing.gapSM,
                  ...DemoAppState.instance.creatorPayouts
                      .map((tx) => _buildTransactionItem(
                            context,
                            description: tx.description,
                            amount:
                                '${tx.amount >= 0 ? '+' : '-'}Rs ${tx.amount.abs().toStringAsFixed(2)}',
                            date: tx.date,
                            isAdd: tx.isAdd,
                            isDark: isDark,
                          )),
                ],
              ),
            ));
  }

  Widget _buildGradientBalanceCard({
    required String title,
    required String amount,
    required String buttonLabel,
    required VoidCallback onPressed,
    bool isCreator = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final gradientColors = isCreator
        ? [
            isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
            isDark ? const Color(0xFF10B981) : const Color(0xFF0F9B8E)
          ]
        : [
            isDark ? AppColors.darkPrimary : AppColors.lightPrimary,
            isDark ? AppColors.darkAccent : AppColors.lightAccent
          ];

    return Container(
      padding: AppSpacing.pAllLG,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppRadius.rMD,
        boxShadow: [
          BoxShadow(
            color: gradientColors[0].withOpacity(0.35),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.0,
            ),
          ),
          AppSpacing.gapSM,
          Text(
            amount,
            style: const TextStyle(
              fontSize: 34,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
          AppSpacing.gapLG,
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onPressed,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: gradientColors[0],
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                shape:
                    const RoundedRectangleBorder(borderRadius: AppRadius.rSM),
              ),
              child: Text(
                buttonLabel,
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isDark,
  }) {
    return InkWell(
        borderRadius: AppRadius.rSM,
        onTap: () => ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$title selected.'))),
        child: Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.sm),
          padding: AppSpacing.pAllSM,
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.darkBorder.withOpacity(0.2)
                : AppColors.lightBackground,
            borderRadius: AppRadius.rSM,
            border: Border.all(
              color: isDark
                  ? AppColors.darkBorder
                  : AppColors.lightBorder.withOpacity(0.5),
            ),
          ),
          child: Row(
            children: [
              Icon(icon,
                  color: isDark
                      ? AppColors.darkTextMuted
                      : AppColors.lightTextMuted),
              AppSpacing.gapSM,
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context)
                        .textTheme
                        .bodyLarge
                        ?.copyWith(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  AppSpacing.gapXXS,
                  Text(
                    subtitle,
                    style: TextStyle(
                        color: isDark
                            ? AppColors.darkTextMuted
                            : AppColors.lightTextMuted,
                        fontSize: 11),
                  ),
                ],
              ),
              const Spacer(),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 12,
                color:
                    isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
              ),
            ],
          ),
        ));
  }

  Widget _buildRevenueSplitRow(
    BuildContext context,
    String title,
    String amount,
    String percentage,
    bool isDark,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: AppSpacing.pAllSM,
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBorder.withOpacity(0.2)
            : AppColors.lightBackground,
        borderRadius: AppRadius.rSM,
        border: Border.all(
          color: isDark
              ? AppColors.darkBorder
              : AppColors.lightBorder.withOpacity(0.5),
        ),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context)
                    .textTheme
                    .bodyLarge
                    ?.copyWith(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              AppSpacing.gapXXS,
              Text(
                percentage,
                style: TextStyle(
                    color: isDark
                        ? AppColors.darkTextMuted
                        : AppColors.lightTextMuted,
                    fontSize: 11),
              ),
            ],
          ),
          const Spacer(),
          Text(
            amount,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: isDark ? AppColors.darkSuccess : AppColors.lightSuccess,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(
    BuildContext context, {
    required String description,
    required String amount,
    required String date,
    required bool isAdd,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: AppSpacing.pAllSM,
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBorder.withOpacity(0.15)
            : AppColors.lightBackground,
        borderRadius: AppRadius.rSM,
        border: Border.all(
          color: isDark
              ? AppColors.darkBorder.withOpacity(0.5)
              : AppColors.lightBorder.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.xs),
            decoration: BoxDecoration(
              color: isAdd
                  ? (isDark ? AppColors.darkSuccess : AppColors.lightSuccess)
                      .withOpacity(0.1)
                  : (isDark ? AppColors.darkAccent : AppColors.lightAccent)
                      .withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isAdd ? Icons.call_received_rounded : Icons.call_made_rounded,
              color: isAdd
                  ? (isDark ? AppColors.darkSuccess : AppColors.lightSuccess)
                  : (isDark ? AppColors.darkAccent : AppColors.lightAccent),
              size: 16,
            ),
          ),
          AppSpacing.gapSM,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  description,
                  style: Theme.of(context)
                      .textTheme
                      .bodyLarge
                      ?.copyWith(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                AppSpacing.gapXXS,
                Text(
                  date,
                  style: TextStyle(
                      color: isDark
                          ? AppColors.darkTextMuted
                          : AppColors.lightTextMuted,
                      fontSize: 11),
                ),
              ],
            ),
          ),
          AppSpacing.gapSM,
          Text(
            amount,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: isAdd
                  ? (isDark ? AppColors.darkSuccess : AppColors.lightSuccess)
                  : (isDark ? AppColors.darkAccent : AppColors.lightAccent),
            ),
          ),
        ],
      ),
    );
  }
}
