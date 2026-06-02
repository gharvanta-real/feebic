import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_radius.dart';
import '../../../../../core/theme/app_spacing.dart';

class PostComposerActionBar extends StatelessWidget {
  const PostComposerActionBar({
    super.key,
    required this.step,
    required this.onBack,
    required this.onNext,
    required this.canGoBack,
  });

  final int step;
  final bool canGoBack;
  final VoidCallback onBack;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;
    final isPublish = step == 2;

    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        border: Border(top: BorderSide(color: border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: canGoBack ? onBack : null,
                icon: const Icon(Icons.arrow_back_rounded, size: 20),
                label: const Text('Back'),
              ),
            ),
            AppSpacing.gapSM,
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: onNext,
                icon: Icon(
                  isPublish
                      ? Icons.publish_rounded
                      : Icons.arrow_forward_rounded,
                  size: 21,
                ),
                label: Text(isPublish ? 'Publish' : 'Continue'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                  shape: const RoundedRectangleBorder(
                    borderRadius: AppRadius.rSM,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
