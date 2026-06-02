import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/state/demo_app_state.dart';

class WalletCreditCard extends StatelessWidget {
  final bool isDark;

  const WalletCreditCard({
    super.key,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final state = DemoAppState.instance;
    final cardColors = isDark
        ? [AppColors.darkPrimary, AppColors.darkAccent.withOpacity(0.6)]
        : [AppColors.lightPrimary, Colors.blueGrey.shade800];

    return Container(
      height: 180,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: cardColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('felbic card link',
                  style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.bold)),
              Icon(Icons.payment_rounded,
                  color: Colors.white.withOpacity(0.8), size: 24),
            ],
          ),
          const Spacer(),
          const Text('**** **** **** 1982',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  letterSpacing: 2,
                  fontWeight: FontWeight.bold)),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('card holder',
                      style: TextStyle(color: Colors.white54, fontSize: 8)),
                  const SizedBox(height: 2),
                  Text(state.fanName.toUpperCase(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
                ],
              ),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('expiry',
                      style: TextStyle(color: Colors.white54, fontSize: 8)),
                  SizedBox(height: 2),
                  Text('12/29',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
