import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';

class PayoutLedgerList extends StatelessWidget {
  final bool isDark;
  final List<DemoTransaction> payoutsList;

  const PayoutLedgerList({
    super.key,
    required this.isDark,
    required this.payoutsList,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDark
        ? AppColors.darkBorder.withOpacity(0.02)
        : AppColors.lightBorder.withOpacity(0.02);
    final borderColor = isDark
        ? AppColors.darkBorder.withOpacity(0.4)
        : AppColors.lightBorder.withOpacity(0.4);

    return Column(
      children: payoutsList.map((tx) {
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
              backgroundColor: Colors.indigo.withOpacity(0.1),
              child: const Icon(Icons.outbox_rounded,
                  size: 12, color: Colors.indigo),
            ),
            title: Text(tx.description,
                style:
                    const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            subtitle: Text(tx.date, style: const TextStyle(fontSize: 8.5)),
            trailing: Text(
              '-Rs ${tx.amount.abs().toStringAsFixed(2)}',
              style: const TextStyle(
                  fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red),
            ),
          ),
        );
      }).toList(),
    );
  }
}
