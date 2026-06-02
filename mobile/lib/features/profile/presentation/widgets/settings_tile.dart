import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';

class SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isDark;
  final Color primaryColor;
  final VoidCallback onTap;

  const SettingsTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isDark,
    required this.primaryColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDark
        ? AppColors.darkBorder.withOpacity(0.04)
        : AppColors.lightBorder.withOpacity(0.04);
    final borderColor = isDark
        ? AppColors.darkBorder.withOpacity(0.5)
        : AppColors.lightBorder.withOpacity(0.5);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.rMD,
        border: Border.all(color: borderColor, width: 0.8),
      ),
      child: ListTile(
        dense: true,
        leading: Icon(icon, color: primaryColor, size: 20),
        title: Text(title,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        subtitle:
            Text(subtitle, style: const TextStyle(fontSize: 9.5, height: 1.3)),
        trailing: const Icon(Icons.chevron_right_rounded, size: 18),
        onTap: onTap,
      ),
    );
  }
}
