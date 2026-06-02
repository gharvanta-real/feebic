import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/cubit/user_mode_cubit.dart';
import '../widgets/creator_profile_view.dart';
import '../widgets/fan_profile_view.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserModeCubit, UserMode>(
      builder: (context, mode) {
        if (mode == UserMode.creator) {
          return const CreatorProfileView();
        } else {
          return const FanProfileView();
        }
      },
    );
  }
}
