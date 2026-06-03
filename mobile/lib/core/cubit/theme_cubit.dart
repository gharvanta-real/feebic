import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:felbic_mobile/core/storage/local_database.dart';

@lazySingleton
class ThemeCubit extends Cubit<ThemeMode> {
  final LocalDatabase _localDatabase;

  ThemeCubit(this._localDatabase) : super(ThemeMode.system) {
    _loadSavedTheme();
  }

  void _loadSavedTheme() {
    final savedMode =
        _localDatabase.get(LocalDatabase.userBoxName, 'theme_mode');
    if (savedMode == 'light') {
      emit(ThemeMode.light);
    } else if (savedMode == 'dark') {
      emit(ThemeMode.dark);
    } else {
      emit(ThemeMode.system);
    }
  }

  void toggleTheme() {
    ThemeMode nextMode;
    if (state == ThemeMode.system) {
      final brightness =
          WidgetsBinding.instance.platformDispatcher.platformBrightness;
      nextMode =
          brightness == Brightness.dark ? ThemeMode.light : ThemeMode.dark;
    } else {
      nextMode = state == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    }
    emit(nextMode);
    _localDatabase.put(LocalDatabase.userBoxName, 'theme_mode', nextMode.name);
  }

  void setThemeMode(ThemeMode mode) {
    emit(mode);
    _localDatabase.put(LocalDatabase.userBoxName, 'theme_mode', mode.name);
  }
}
