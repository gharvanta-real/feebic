import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';

class SubscriptionTiersScreen extends StatefulWidget {
  const SubscriptionTiersScreen({super.key});

  @override
  State<SubscriptionTiersScreen> createState() =>
      _SubscriptionTiersScreenState();
}

class _SubscriptionTiersScreenState extends State<SubscriptionTiersScreen> {
  double _priceRate = 399.0;
  bool _isSaving = false;
  final List<Map<String, dynamic>> _benefits = [
    {
      'perk': 'Direct private messaging (DMs) with response guarantee',
      'enabled': true
    },
    {
      'perk': 'Exclusive weekly premium fitness/yoga video releases',
      'enabled': true
    },
    {
      'perk': 'Access to behind-the-scenes daily travel raw collections',
      'enabled': true
    },
    {'perk': 'Early access to guest collaboration sessions', 'enabled': false},
  ];

  @override
  void initState() {
    super.initState();
    _priceRate = DemoAppState.instance.creatorSubscriptionPrice;
  }

  void _saveRate() async {
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 800));
    DemoAppState.instance.updateSubscriptionPrice(_priceRate);
    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('subscription rate saved!')));
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor =
        isDark ? AppColors.darkPrimary : AppColors.lightPrimary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription tiers & rates',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          _buildSliderBox(isDark, primaryColor),
          AppSpacing.gapLG,
          _buildProjectionCard(isDark),
          AppSpacing.gapLG,
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
            child: Text('subscriber tier privileges',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey)),
          ),
          _buildPerksBox(isDark, primaryColor),
          AppSpacing.gapXL,
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                minimumSize: const Size.fromHeight(48)),
            onPressed: _isSaving ? null : _saveRate,
            child: _isSaving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : const Text('save rates & benefits',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSliderBox(bool isDark, Color primaryColor) {
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
          const Text('configure subscription rate',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          AppSpacing.gapXXS,
          const Text('adjust monthly fee paid by subscribers',
              style: TextStyle(color: Colors.grey, fontSize: 10)),
          AppSpacing.gapLG,
          Center(
              child: Text('Rs ${_priceRate.round()}/mo',
                  style: TextStyle(
                      color: primaryColor,
                      fontSize: 28,
                      fontWeight: FontWeight.bold))),
          AppSpacing.gapMD,
          Slider(
            value: _priceRate,
            min: 99.0,
            max: 1999.0,
            divisions: 38,
            activeColor: primaryColor,
            label: 'Rs ${_priceRate.round()}',
            onChanged: (val) => setState(() => _priceRate = val),
          ),
        ],
      ),
    );
  }

  Widget _buildProjectionCard(bool isDark) {
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
              Text('projected monthly revenue',
                  style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey,
                      fontWeight: FontWeight.bold)),
              SizedBox(height: 4),
              Text('based on 190 active fans',
                  style: TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ),
          Text('Rs ${(_priceRate * 190).toStringAsFixed(2)}',
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.green)),
        ],
      ),
    );
  }

  Widget _buildPerksBox(bool isDark, Color primaryColor) {
    return Container(
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
        children: _benefits.map((benefit) {
          return CheckboxListTile(
            title: Text(benefit['perk'], style: const TextStyle(fontSize: 11)),
            value: benefit['enabled'],
            activeColor: primaryColor,
            onChanged: (val) => setState(() => benefit['enabled'] = val),
          );
        }).toList(),
      ),
    );
  }
}
