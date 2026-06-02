import 'package:feebic_mobile/core/cubit/theme_cubit.dart';
import 'package:feebic_mobile/core/cubit/user_mode_cubit.dart';
import 'package:feebic_mobile/core/storage/local_database.dart';
import 'package:feebic_mobile/features/wallet/presentation/screens/wallet_screen.dart';
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

void main() {
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

    expect(find.text('My Wallet'), findsOneWidget);
    expect(find.text('Add Funds'), findsOneWidget);

    await tester.tap(find.text('Add Funds'));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Deposit'), findsOneWidget);
  });
}
