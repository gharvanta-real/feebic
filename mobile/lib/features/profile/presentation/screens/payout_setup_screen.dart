import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import '../widgets/payout_ledger_list.dart';

class PayoutSetupScreen extends StatefulWidget {
  const PayoutSetupScreen({super.key});

  @override
  State<PayoutSetupScreen> createState() => _PayoutSetupScreenState();
}

class _PayoutSetupScreenState extends State<PayoutSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _bankNameController = TextEditingController();
  final _holderController = TextEditingController();
  final _accountController = TextEditingController();
  final _routingController = TextEditingController();
  final _payoutController = TextEditingController();
  bool _isSavingBank = false;
  bool _isPayouting = false;

  @override
  void initState() {
    super.initState();
    final s = DemoAppState.instance;
    _bankNameController.text = s.bankName;
    _holderController.text = s.bankAccountName;
    _accountController.text = s.bankAccountNumber;
    _routingController.text = s.bankRoutingNumber;
  }

  @override
  void dispose() {
    _bankNameController.dispose();
    _holderController.dispose();
    _accountController.dispose();
    _routingController.dispose();
    _payoutController.dispose();
    super.dispose();
  }

  void _saveBank() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSavingBank = true);
    await Future.delayed(const Duration(milliseconds: 800));
    DemoAppState.instance.configureBank(
      accountName: _holderController.text,
      accountNumber: _accountController.text,
      routingNumber: _routingController.text,
      bank: _bankNameController.text,
    );
    if (mounted) {
      setState(() => _isSavingBank = false);
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('bank details saved successfully!')));
    }
  }

  void _withdraw(double amount) async {
    if (amount <= 0 || amount > DemoAppState.instance.creatorEarnings) return;
    setState(() => _isPayouting = true);
    await Future.delayed(const Duration(milliseconds: 1000));
    DemoAppState.instance.requestPayout(amount);
    if (mounted) {
      setState(() => _isPayouting = false);
      _payoutController.clear();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('successfully requested payout transfer!')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payout billing setup',
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
              _buildEarningsCard(state.creatorEarnings, isDark),
              AppSpacing.gapLG,
              _buildWithdrawBox(state, isDark, primaryColor),
              AppSpacing.gapLG,
              _buildStripeConfigBox(isDark, primaryColor),
              AppSpacing.gapLG,
              const Padding(
                padding: EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
                child: Text('recent bank payouts ledger',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey)),
              ),
              PayoutLedgerList(
                  isDark: isDark, payoutsList: state.creatorPayouts),
            ],
          );
        },
      ),
    );
  }

  Widget _buildEarningsCard(double earnings, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [Colors.deepPurple.shade900, Colors.indigo.shade800]
              : [Colors.deepPurple, Colors.indigo],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('total creator earnings',
              style: TextStyle(
                  color: Colors.white70,
                  fontSize: 10,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text('Rs ${earnings.toStringAsFixed(2)}',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text('available for instant payout withdrawal',
              style: TextStyle(color: Colors.white54, fontSize: 10)),
        ],
      ),
    );
  }

  Widget _buildWithdrawBox(
      DemoAppState state, bool isDark, Color primaryColor) {
    if (!state.isBankConnected) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
            color: Colors.amber.withOpacity(0.1),
            border: Border.all(color: Colors.amber.withOpacity(0.5))),
        child: const Text(
            'payouts disabled: please link bank details below to configure instant payouts.',
            style: TextStyle(
                fontSize: 10,
                color: Colors.amber,
                fontWeight: FontWeight.bold)),
      );
    }
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
          const Text('request bank payout',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          AppSpacing.gapMD,
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _payoutController,
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
                onPressed: _isPayouting
                    ? null
                    : () => _withdraw(
                        double.tryParse(_payoutController.text) ?? 0.0),
                child: _isPayouting
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('withdraw',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStripeConfigBox(bool isDark, Color primaryColor) {
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
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            const Row(children: [
              Icon(Icons.account_balance_rounded, size: 18),
              SizedBox(width: 6),
              Text('stripe bank configuration',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))
            ]),
            AppSpacing.gapMD,
            _buildField(_bankNameController, 'bank name'),
            AppSpacing.gapSM,
            _buildField(_holderController, 'account holder name'),
            AppSpacing.gapSM,
            _buildField(_accountController, 'account number'),
            AppSpacing.gapSM,
            _buildField(_routingController, 'routing code / IBAN'),
            AppSpacing.gapMD,
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  minimumSize: const Size.fromHeight(40)),
              onPressed: _isSavingBank ? null : _saveBank,
              child: _isSavingBank
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('connect bank details',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController controller, String label) {
    return TextFormField(
      controller: controller,
      style: const TextStyle(fontSize: 13),
      decoration: InputDecoration(
          labelText: label, border: const OutlineInputBorder(), isDense: true),
      validator: (val) => val == null || val.isEmpty ? 'field required' : null,
    );
  }
}
