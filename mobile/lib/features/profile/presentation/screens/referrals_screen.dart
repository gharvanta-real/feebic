import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/di/injection.dart';

class ReferralsScreen extends StatelessWidget {
  const ReferralsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.darkPrimary : AppColors.lightPrimary;
    final user = getIt<AuthSession>().user ?? {};
    final username = (user['username'] ?? 'creator').toString();
    final referralLink = 'https://felbic.gharvanta.in/register?ref=$username';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Referral program',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Icon(Icons.group_add_rounded, size: 48, color: primaryColor),
          AppSpacing.gapMD,
          const Center(
            child: Text(
              'Invite Creators, Earn Together',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Share your referral link with other creators. Earn 5% from all of their membership and content sales for their first 12 months on Felbic.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey, fontSize: 11.5, height: 1.45),
          ),
          AppSpacing.gapLG,
          
          // Link box
          Container(
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
                const Text('YOUR REFERRAL LINK',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5)),
                AppSpacing.gapSM,
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        referralLink,
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: referralLink));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Referral link copied to clipboard!'), behavior: SnackBarBehavior.floating),
                        );
                      },
                    )
                  ],
                ),
              ],
            ),
          ),
          AppSpacing.gapLG,
          
          // Stats grid
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
            child: Text('referral performance',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
          ),
          Row(
            children: [
              Expanded(
                child: _buildStatCard('0', 'referred', isDark),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _buildStatCard('Rs 0.00', 'total earnings', isDark),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildStatCard(String value, String label, bool isDark) {
    final bgColor = isDark
        ? AppColors.darkBorder.withOpacity(0.04)
        : AppColors.lightBorder.withOpacity(0.04);
    final borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadius.rMD,
        border: Border.all(color: borderColor, width: 0.8),
      ),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
