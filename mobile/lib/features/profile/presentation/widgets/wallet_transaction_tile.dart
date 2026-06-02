import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';

class WalletTransactionTile extends StatelessWidget {
  final DemoTransaction tx;
  final bool isDark;

  const WalletTransactionTile({
    super.key,
    required this.tx,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDark
        ? AppColors.darkBorder.withOpacity(0.02)
        : AppColors.lightBorder.withOpacity(0.02);
    final borderColor = isDark
        ? AppColors.darkBorder.withOpacity(0.4)
        : AppColors.lightBorder.withOpacity(0.4);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.rSM,
        border: Border.all(color: borderColor, width: 0.8),
      ),
      child: ListTile(
        dense: true,
        leading: CircleAvatar(
          radius: 12,
          backgroundColor: tx.isAdd
              ? Colors.green.withOpacity(0.1)
              : Colors.red.withOpacity(0.1),
          child: Icon(tx.isAdd ? Icons.add_rounded : Icons.remove_rounded,
              size: 14, color: tx.isAdd ? Colors.green : Colors.red),
        ),
        title: Text(tx.description,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
        subtitle: Text(tx.date, style: const TextStyle(fontSize: 8.5)),
        trailing: Text(
          '${tx.isAdd ? "+" : "-"}Rs ${tx.amount.abs().toStringAsFixed(2)}',
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: tx.isAdd ? Colors.green : Colors.red),
        ),
      ),
    );
  }
}
