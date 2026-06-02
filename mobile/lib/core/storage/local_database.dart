import 'package:hive_flutter/hive_flutter.dart';
import 'package:injectable/injectable.dart';

import 'package:flutter/foundation.dart';

@lazySingleton
class LocalDatabase {
  static const String feedBoxName = 'cached_feed';
  static const String chatBoxName = 'cached_chats';
  static const String userBoxName = 'user_profile';

  Future<void> init() async {
    await Hive.initFlutter();

    if (kIsWeb) {
      // Bypass encryption on web to avoid browser crypto crashes in insecure HTTP origins
      await Hive.openBox(feedBoxName);
      await Hive.openBox(chatBoxName);
      await Hive.openBox(userBoxName);
    } else {
      // 32-byte secure symmetric key representation for native mobile
      final List<int> encryptionKey = [
        0x1f,
        0x2e,
        0x3d,
        0x4c,
        0x5b,
        0x6a,
        0x79,
        0x88,
        0x97,
        0xa6,
        0xb5,
        0xc4,
        0xd3,
        0xe2,
        0xf1,
        0x00,
        0x10,
        0x21,
        0x32,
        0x43,
        0x54,
        0x65,
        0x76,
        0x87,
        0x98,
        0xa9,
        0xba,
        0xcb,
        0xdc,
        0xed,
        0xfe,
        0x0f
      ];
      final cipher = HiveAesCipher(encryptionKey);
      await Hive.openBox(feedBoxName, encryptionCipher: cipher);
      await Hive.openBox(chatBoxName, encryptionCipher: cipher);
      await Hive.openBox(userBoxName, encryptionCipher: cipher);
    }
  }

  // Generic methods to read/write/clear box contents
  Box getBox(String boxName) {
    return Hive.box(boxName);
  }

  Future<void> put(String boxName, String key, dynamic value) async {
    final box = getBox(boxName);
    await box.put(key, value);
  }

  dynamic get(String boxName, String key, {dynamic defaultValue}) {
    final box = getBox(boxName);
    return box.get(key, defaultValue: defaultValue);
  }

  Future<void> delete(String boxName, String key) async {
    final box = getBox(boxName);
    await box.delete(key);
  }

  Future<void> clearBox(String boxName) async {
    final box = getBox(boxName);
    await box.clear();
  }

  Future<void> closeAll() async {
    await Hive.close();
  }
}
