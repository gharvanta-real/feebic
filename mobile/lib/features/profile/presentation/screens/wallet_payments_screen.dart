import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/di/injection.dart';
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

  List<dynamic> _cards = [];
  bool _isLoadingCards = false;

  @override
  void initState() {
    super.initState();
    _fetchCards();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _fetchCards() async {
    if (!mounted) return;
    setState(() => _isLoadingCards = true);
    try {
      final response = await getIt<ApiClient>().get('/wallet/cards');
      if (response.statusCode == 200 && response.data != null) {
        if (mounted) {
          setState(() {
            _cards = response.data as List<dynamic>;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching cards: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingCards = false);
      }
    }
  }

  void _setDefaultCard(String cardId) async {
    try {
      final response = await getIt<ApiClient>().put('/wallet/cards/$cardId/default');
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Default payment card updated'), behavior: SnackBarBehavior.floating),
          );
        }
        _fetchCards();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update default card: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  void _deleteCard(String cardId) async {
    try {
      final response = await getIt<ApiClient>().delete('/wallet/cards/$cardId');
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Card removed successfully'), behavior: SnackBarBehavior.floating),
          );
        }
        _fetchCards();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete card: $e'), behavior: SnackBarBehavior.floating),
        );
      }
    }
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

  void _showAddCardSheet() {
    final formKey = GlobalKey<FormState>();
    final holderController = TextEditingController();
    final numberController = TextEditingController();
    final expiryController = TextEditingController();
    final cvcController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        final primaryColor = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

        return StatefulBuilder(
          builder: (context, setModalState) {
            void submit() async {
              if (!formKey.currentState!.validate()) return;

              setModalState(() => isSubmitting = true);
              try {
                final rawNumber = numberController.text.replaceAll(' ', '');
                if (rawNumber.length < 16) {
                  throw Exception('Card number must be 16 digits');
                }
                final maskedNumber = '**** **** **** ${rawNumber.substring(rawNumber.length - 4)}';

                final response = await getIt<ApiClient>().post('/wallet/cards', data: {
                  'holder': holderController.text.trim(),
                  'number': maskedNumber,
                  'expiry': expiryController.text.trim(),
                });

                if (response.statusCode == 200 || response.statusCode == 201) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Card linked successfully!'), behavior: SnackBarBehavior.floating),
                    );
                    Navigator.pop(ctx);
                  }
                  _fetchCards();
                } else {
                  throw Exception('API returned status ${response.statusCode}');
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(content: Text('Failed to link card: $e'), behavior: SnackBarBehavior.floating),
                  );
                }
              } finally {
                setModalState(() => isSubmitting = false);
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                top: AppSpacing.md,
                bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
              ),
              child: Form(
                key: formKey,
                child: ListView(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    const Text(
                      'Link Credit / Debit Card',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      textAlign: TextAlign.center,
                    ),
                    AppSpacing.gapMD,
                    TextFormField(
                      controller: holderController,
                      style: const TextStyle(fontSize: 12.5),
                      decoration: const InputDecoration(
                        labelText: 'Cardholder Name',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                    ),
                    AppSpacing.gapMD,
                    TextFormField(
                      controller: numberController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(fontSize: 12.5),
                      decoration: const InputDecoration(
                        labelText: 'Card Number',
                        hintText: '4111 2222 3333 4444',
                        border: OutlineInputBorder(),
                        isDense: true,
                        prefixIcon: Icon(Icons.credit_card, size: 16),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                    ),
                    AppSpacing.gapMD,
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: expiryController,
                            style: const TextStyle(fontSize: 12.5),
                            decoration: const InputDecoration(
                              labelText: 'Expiry (MM/YY)',
                              hintText: '12/29',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: TextFormField(
                            controller: cvcController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(fontSize: 12.5),
                            decoration: const InputDecoration(
                              labelText: 'CVC',
                              hintText: '123',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                          ),
                        ),
                      ],
                    ),
                    AppSpacing.gapLG,
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        minimumSize: const Size.fromHeight(42),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(21)),
                      ),
                      onPressed: isSubmitting ? null : submit,
                      child: isSubmitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Verify & Add Card',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    final defaultCard = _cards.firstWhere(
      (c) => c['isDefault'] == true,
      orElse: () => null,
    ) as Map<String, dynamic>?;

    final displayCard = defaultCard ?? (_cards.isNotEmpty ? _cards.first as Map<String, dynamic>? : null);

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
              WalletCreditCard(isDark: isDark, cardData: displayCard),
              AppSpacing.gapLG,
              _buildBalanceCard(state.fanBalance, isDark, primaryColor),
              AppSpacing.gapLG,
              _buildDepositBox(isDark, primaryColor),
              AppSpacing.gapLG,
              _buildCardsSection(isDark, primaryColor),
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

  Widget _buildCardsSection(bool isDark, Color primaryColor) {
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Linked Cards', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              TextButton.icon(
                onPressed: _showAddCardSheet,
                icon: const Icon(Icons.add_rounded, size: 14),
                label: const Text('Add Card', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                style: TextButton.styleFrom(
                  foregroundColor: primaryColor,
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          AppSpacing.gapSM,
          if (_isLoadingCards)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(8.0),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else if (_cards.isEmpty)
            const Text(
              'No linked cards found. Add a card above to renew subscriptions.',
              style: TextStyle(color: Colors.grey, fontSize: 11),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _cards.length,
              itemBuilder: (context, index) {
                final card = _cards[index] as Map<String, dynamic>;
                final bool isDefault = card['isDefault'] == true;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.black26 : Colors.white70,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isDefault ? primaryColor : Colors.grey.withOpacity(0.2),
                        width: isDefault ? 1.2 : 0.8,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.credit_card_rounded, color: primaryColor, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    card['number'] ?? '**** **** **** ****',
                                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                                  ),
                                  if (isDefault) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: primaryColor.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        'DEFAULT',
                                        style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: primaryColor),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${(card['holder'] ?? '').toString().toUpperCase()} • Exp ${card['expiry'] ?? ''}',
                                style: const TextStyle(fontSize: 9, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        if (!isDefault)
                          TextButton(
                            onPressed: () => _setDefaultCard(card['id'].toString()),
                            style: TextButton.styleFrom(
                              foregroundColor: primaryColor,
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text('Set Default', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, size: 16, color: Colors.redAccent),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: () => _deleteCard(card['id'].toString()),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
