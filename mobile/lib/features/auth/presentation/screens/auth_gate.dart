import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../main_navigation_screen.dart';
import 'auth_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final AuthSession _session;

  @override
  void initState() {
    super.initState();
    _session = getIt<AuthSession>();
    _session.addListener(_syncMode);
    _session.boot();
  }

  @override
  void dispose() {
    _session.removeListener(_syncMode);
    super.dispose();
  }

  void _syncMode() {
    if (!_session.isAuthenticated) return;
    final nextMode =
        _session.role == 'creator' ? UserMode.creator : UserMode.fan;
    context.read<UserModeCubit>().setMode(nextMode);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _session,
      builder: (context, _) {
        if (_session.isBooting) return const _BootScreen();
        if (_session.isAuthenticated) return const MainNavigationScreen();
        return AuthScreen(session: _session);
      },
    );
  }
}

class _BootScreen extends StatelessWidget {
  const _BootScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'felbic',
              style: TextStyle(
                color: AppColors.lightPrimary,
                fontSize: 24,
                fontWeight: FontWeight.w900,
              ),
            ),
            SizedBox(height: 14),
            SizedBox(
              width: 72,
              child: LinearProgressIndicator(minHeight: 3),
            ),
          ],
        ),
      ),
    );
  }
}
