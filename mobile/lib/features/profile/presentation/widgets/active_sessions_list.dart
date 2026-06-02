import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/state/demo_app_state.dart';

class ActiveSessionsList extends StatelessWidget {
  final bool isDark;
  final Color primaryColor;

  const ActiveSessionsList({
    super.key,
    required this.isDark,
    required this.primaryColor,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: DemoAppState.instance,
      builder: (context, _) {
        final sessions = DemoAppState.instance.activeSessions;
        return Column(
          children: sessions.map((session) {
            final isCurrent = session['status'] == 'Active now';
            return Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.darkBorder.withOpacity(0.04)
                    : AppColors.lightBorder.withOpacity(0.04),
                borderRadius: AppRadius.rMD,
                border: Border.all(
                    color:
                        isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    width: 0.8),
              ),
              child: Row(
                children: [
                  Icon(
                    session['device']!.contains('iPhone')
                        ? Icons.phone_android_rounded
                        : Icons.laptop_mac_rounded,
                    size: 24,
                    color: primaryColor,
                  ),
                  AppSpacing.gapSM,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(session['device']!,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 11.5)),
                        Text('${session['location']} - IP: ${session['ip']}',
                            style: const TextStyle(
                                color: Colors.grey, fontSize: 9.5)),
                        Text(
                          session['status']!,
                          style: TextStyle(
                            color: isCurrent ? Colors.green : Colors.grey,
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isCurrent)
                    TextButton(
                      style: TextButton.styleFrom(
                          minimumSize: Size.zero,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4)),
                      onPressed: () {
                        DemoAppState.instance.terminateSession(session['id']!);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text(
                                  'device session terminated successfully!')),
                        );
                      },
                      child: const Text('terminate',
                          style: TextStyle(
                              color: Colors.red,
                              fontSize: 10,
                              fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
