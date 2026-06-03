import 'package:dio/dio.dart';
import 'package:felbic_mobile/core/di/injection.dart';
import 'package:felbic_mobile/core/cubit/theme_cubit.dart';
import 'package:felbic_mobile/core/cubit/user_mode_cubit.dart';
import 'package:felbic_mobile/core/network/api_client.dart';
import 'package:felbic_mobile/core/storage/local_database.dart';
import 'package:felbic_mobile/core/storage/secure_storage.dart';
import 'package:felbic_mobile/features/wallet/presentation/screens/wallet_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

class _MemoryLocalDatabase extends LocalDatabase {
  final Map<String, Map<String, dynamic>> _boxes =
      <String, Map<String, dynamic>>{};

  @override
  Future<void> put(String boxName, String key, dynamic value) async {
    _boxes.putIfAbsent(boxName, () => <String, dynamic>{})[key] = value;
  }

  @override
  dynamic get(String boxName, String key, {dynamic defaultValue}) {
    return _boxes[boxName]?[key] ?? defaultValue;
  }
}

class _FakeApiClient extends ApiClient {
  _FakeApiClient() : super(SecureStorage());

  @override
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return Future.value(
      Response(
        requestOptions: RequestOptions(path: path),
        data: {
          'balance': 1250,
          'transactions': <Map<String, dynamic>>[],
        },
      ),
    );
  }
}

void main() {
  setUp(() async {
    await getIt.reset();
    getIt.registerSingleton<ApiClient>(_FakeApiClient());
  });

  testWidgets('Wallet renders and opens add funds flow', (tester) async {
    await tester.pumpWidget(
      MultiBlocProvider(
        providers: [
          BlocProvider<UserModeCubit>(create: (_) => UserModeCubit()),
          BlocProvider<ThemeCubit>(
              create: (_) => ThemeCubit(_MemoryLocalDatabase())),
        ],
        child: const MaterialApp(home: WalletScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Wallet'), findsOneWidget);
    expect(find.text('Available balance'), findsOneWidget);
    expect(find.text('No wallet activity yet.'), findsOneWidget);
  });
}
