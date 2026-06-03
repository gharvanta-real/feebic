// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:get_it/get_it.dart' as _i174;
import 'package:injectable/injectable.dart' as _i526;

import '../auth/auth_session.dart' as _i286;
import '../cubit/theme_cubit.dart' as _i319;
import '../cubit/user_mode_cubit.dart' as _i270;
import '../network/api_client.dart' as _i557;
import '../network/cloudinary_service.dart' as _i152;
import '../storage/local_database.dart' as _i998;
import '../storage/secure_storage.dart' as _i619;

extension GetItInjectableX on _i174.GetIt {
// initializes the registration of main-scope dependencies inside of GetIt
  _i174.GetIt init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) {
    final gh = _i526.GetItHelper(
      this,
      environment,
      environmentFilter,
    );
    gh.lazySingleton<_i270.UserModeCubit>(() => _i270.UserModeCubit());
    gh.lazySingleton<_i998.LocalDatabase>(() => _i998.LocalDatabase());
    gh.lazySingleton<_i619.SecureStorage>(() => _i619.SecureStorage());
    gh.lazySingleton<_i286.AuthSession>(() => _i286.AuthSession(
          apiClient: gh<_i557.ApiClient>(),
          secureStorage: gh<_i619.SecureStorage>(),
        ));
    gh.lazySingleton<_i557.ApiClient>(
        () => _i557.ApiClient(gh<_i619.SecureStorage>()));
    gh.lazySingleton<_i319.ThemeCubit>(
        () => _i319.ThemeCubit(gh<_i998.LocalDatabase>()));
    gh.lazySingleton<_i152.CloudinaryService>(
        () => _i152.CloudinaryService(gh<_i557.ApiClient>()));
    return this;
  }
}
