import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

enum UserMode {
  fan, // Visitor / Subscriber
  creator, // Content Creator / Publisher
}

@lazySingleton
class UserModeCubit extends Cubit<UserMode> {
  UserModeCubit() : super(UserMode.fan);

  void toggleMode() {
    emit(state == UserMode.fan ? UserMode.creator : UserMode.fan);
  }

  void setMode(UserMode mode) {
    emit(mode);
  }
}
