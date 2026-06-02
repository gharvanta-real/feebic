import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';

class DashboardSection extends StatelessWidget {
  const DashboardSection({
    super.key,
    required this.title,
    required this.children,
    this.trailing,
  });

  final String title;
  final Widget? trailing;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          AppSpacing.gapSM,
          ...children,
        ],
      ),
    );
  }
}

class MetricCard extends StatelessWidget {
  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.delta,
    this.accent,
  });

  final String label;
  final String value;
  final String? delta;
  final IconData icon;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary =
        accent ?? (isDark ? AppColors.darkPrimary : AppColors.lightPrimary);
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final muted = isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;

    return Container(
      padding: AppSpacing.pAllSM,
      decoration: BoxDecoration(
        borderRadius: AppRadius.rSM,
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 23, color: primary),
              const Spacer(),
              if (delta != null)
                Text(
                  delta!,
                  style: TextStyle(
                    color: primary,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
          AppSpacing.gapSM,
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          AppSpacing.gapXXS,
          Text(label, style: TextStyle(fontSize: 11, color: muted)),
        ],
      ),
    );
  }
}

class ActionTile extends StatelessWidget {
  const ActionTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.badge,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final muted = isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.rSM,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: AppSpacing.pAllSM,
        decoration: BoxDecoration(
          borderRadius: AppRadius.rSM,
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            Icon(icon, size: 25, color: primary),
            AppSpacing.gapSM,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  AppSpacing.gapXXS,
                  Text(subtitle, style: TextStyle(color: muted, fontSize: 11)),
                ],
              ),
            ),
            if (badge != null) ...[
              AppSpacing.gapSM,
              DecoratedBox(
                decoration: BoxDecoration(
                  color: primary.withOpacity(0.12),
                  borderRadius: AppRadius.rFull,
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs, vertical: AppSpacing.xxs),
                  child: Text(
                    badge!,
                    style: TextStyle(
                        color: primary,
                        fontSize: 10,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
            AppSpacing.gapXS,
            Icon(Icons.chevron_right_rounded, color: muted, size: 22),
          ],
        ),
      ),
    );
  }
}

class ActivityRow extends StatelessWidget {
  const ActivityRow({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.positive = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final muted = isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted;
    final color = positive
        ? (isDark ? AppColors.darkSuccess : AppColors.lightSuccess)
        : (isDark ? AppColors.darkPrimary : AppColors.lightPrimary);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: AppSpacing.pAllSM,
      decoration: BoxDecoration(
        borderRadius: AppRadius.rSM,
        border: Border.all(color: border.withOpacity(0.8)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 22, color: color),
          AppSpacing.gapSM,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.bold)),
                AppSpacing.gapXXS,
                Text(subtitle, style: TextStyle(fontSize: 10.5, color: muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class MiniBarChart extends StatelessWidget {
  const MiniBarChart({
    super.key,
    required this.values,
    required this.labels,
  });

  final List<double> values;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).primaryColor;
    final maxValue =
        values.fold<double>(1, (max, value) => value > max ? value : max);

    return SizedBox(
      height: 118,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(values.length, (index) {
          final height = 72 * (values[index] / maxValue);
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    height: height.clamp(8, 72),
                    decoration: BoxDecoration(
                      color: primary.withOpacity(0.82),
                      borderRadius: AppRadius.rXS,
                    ),
                  ),
                  AppSpacing.gapXS,
                  Text(labels[index], style: const TextStyle(fontSize: 9)),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}
