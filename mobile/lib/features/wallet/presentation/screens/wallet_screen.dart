import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_spacing.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  bool _isLoading = true;
  double _balance = 0;
  List<Map<String, dynamic>> _transactions = [];

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    setState(() => _isLoading = true);
    try {
      final response = await getIt<ApiClient>().get('/wallet');
      final data = Map<String, dynamic>.from(response.data as Map);
      if (!mounted) return;
      setState(() {
        _balance = ((data['balance'] ?? 0) as num).toDouble();
        final rows = data['transactions'] is List
            ? data['transactions'] as List
            : <dynamic>[];
        _transactions = rows
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } catch (e) {
      debugPrint('Error loading wallet: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(symbol: 'Rs ', decimalDigits: 2);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: RefreshIndicator(
        onRefresh: _loadWallet,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: AppSpacing.pAllMD,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Padding(
                      padding: AppSpacing.pAllMD,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Available balance',
                              style: TextStyle(fontWeight: FontWeight.bold)),
                          AppSpacing.gapXS,
                          Text(currency.format(_balance),
                              style: const TextStyle(
                                  fontSize: 26, fontWeight: FontWeight.w900)),
                        ],
                      ),
                    ),
                  ),
                  AppSpacing.gapLG,
                  const Text('Transactions',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  AppSpacing.gapSM,
                  if (_transactions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 60),
                      child: Center(child: Text('No wallet activity yet.')),
                    )
                  else
                    ..._transactions.map((tx) {
                      final amount = ((tx['amount'] ?? 0) as num).toDouble();
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(amount >= 0
                            ? Icons.arrow_downward_rounded
                            : Icons.arrow_upward_rounded),
                        title: Text(
                            (tx['title'] ?? tx['type'] ?? '').toString(),
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text((tx['created_at'] ?? '').toString()),
                        trailing: Text(currency.format(amount)),
                      );
                    }),
                ],
              ),
      ),
    );
  }
}
