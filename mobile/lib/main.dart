import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/cubit/user_mode_cubit.dart';
import 'core/cubit/theme_cubit.dart';
import 'core/di/injection.dart';
import 'core/storage/local_database.dart';
import 'core/theme/app_theme.dart';
import 'features/main_navigation_screen.dart';

void main() async {
  // Ensure Flutter engine is initialized before running setups
  WidgetsFlutterBinding.ensureInitialized();

  // Configure Dependency Injection singletons
  configureDependencies();

  // Initialize offline caching (Hive Database)
  await getIt<LocalDatabase>().init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<UserModeCubit>(
            create: (context) => getIt<UserModeCubit>()),
        BlocProvider<ThemeCubit>(create: (context) => getIt<ThemeCubit>()),
      ],
      child: BlocBuilder<ThemeCubit, ThemeMode>(
        builder: (context, themeMode) {
          return MaterialApp(
            title: 'Felbic Mobile',
            debugShowCheckedModeBanner: false,

            // Themes matching the web tokens system
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeMode,

            home: const MainNavigationScreen(),
          );
        },
      ),
    );
  }
}
