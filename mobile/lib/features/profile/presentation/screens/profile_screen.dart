import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
import '../../../../core/auth/auth_session.dart';
import '../../../../core/di/injection.dart';
import '../widgets/creator_profile_view.dart';
import '../widgets/fan_profile_view.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      await getIt<AuthSession>().refreshProfile();
    } catch (e) {
      debugPrint('Error loading profile: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authSession = getIt<AuthSession>();

    // Show loading spinner only on initial load when no cached profile exists.
    if (_isLoading && authSession.user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadProfile,
      child: BlocBuilder<UserModeCubit, UserMode>(
        builder: (context, state) {
          if (state == UserMode.creator) {
            return const CreatorProfileView();
          } else {
            return const FanProfileView();
          }
        },
      ),
    );
  }
}
