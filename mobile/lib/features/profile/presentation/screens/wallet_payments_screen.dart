import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import '../widgets/wallet_credit_card.dart';
import '../widgets/wallet_transaction_tile.dart';

class WalletPaymentsScreen extends StatefulWidget {
  const WalletPaymentsScreen({super.key});

  @override
  State<WalletPaymentsScreen> createState() => _WalletPaymentsScreenState();
}

class _WalletPaymentsScreenState extends State<WalletPaymentsScreen> {
  final _amountController = TextEditingController();
  bool _isDepositing = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _deposit(double amount) async {
    if (amount <= 0) return;
    setState(() => _isDepositing = true);
    await Future.delayed(const Duration(milliseconds: 1000));
    DemoAppState.instance.addFunds(amount);
    if (mounted) {
      setState(() => _isDepositing = false);
      _amountController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'successfully deposited Rs ${amount.toStringAsFixed(2)} to wallet!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallets & payments',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: AnimatedBuilder(
        animation: DemoAppState.instance,
        builder: (context, _) {
          final state = DemoAppState.instance;
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              WalletCreditCard(isDark: isDark),
              AppSpacing.gapLG,
              _buildBalanceCard(state.fanBalance, isDark, primaryColor),
              AppSpacing.gapLG,
              _buildDepositBox(isDark, primaryColor),
              AppSpacing.gapLG,
              const Padding(
                padding: EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
                child: Text('recent transactions',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey)),
              ),
              Column(
                children: state.fanTransactions
                    .map((tx) => WalletTransactionTile(tx: tx, isDark: isDark))
                    .toList(),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBalanceCard(double balance, bool isDark, Color primaryColor) {
    return Container(
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('current balance',
                  style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey,
                      fontWeight: FontWeight.bold)),
              SizedBox(height: 4),
              Text('available wallet funds',
                  style: TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ),
          Text('Rs ${balance.toStringAsFixed(2)}',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: primaryColor)),
        ],
      ),
    );
  }

  Widget _buildDepositBox(bool isDark, Color primaryColor) {
    return Container(
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
          const Text('deposit wallet funds',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          AppSpacing.gapMD,
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 13),
                  decoration: const InputDecoration(
                      prefixText: 'Rs ',
                      hintText: 'amount',
                      border: OutlineInputBorder(),
                      isDense: true),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    minimumSize: const Size(100, 38)),
                onPressed: _isDepositing
                    ? null
                    : () => _deposit(
                        double.tryParse(_amountController.text) ?? 0.0),
                child: _isDepositing
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('deposit',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          AppSpacing.gapSM,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [500.0, 1000.0, 2000.0].map((amt) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, 30)),
                    onPressed: () => _deposit(amt),
                    child: Text('+Rs ${amt.toInt()}',
                        style: TextStyle(
                            color: primaryColor,
                            fontSize: 10,
                            fontWeight: FontWeight.bold)),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
