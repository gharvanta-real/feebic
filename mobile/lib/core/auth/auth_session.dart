import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:injectable/injectable.dart';
import 'package:felbic_mobile/core/di/injection.dart';
import 'package:felbic_mobile/core/network/api_client.dart';
import 'package:felbic_mobile/core/storage/secure_storage.dart';

@lazySingleton
class AuthSession extends ChangeNotifier {
  AuthSession({
    ApiClient? apiClient,
    SecureStorage? secureStorage,
  })  : _apiClient = apiClient ?? getIt<ApiClient>(),
        _secureStorage = secureStorage ?? getIt<SecureStorage>();

  final ApiClient _apiClient;
  final SecureStorage _secureStorage;

  bool isBooting = true;
  bool isLoading = false;
  Map<String, dynamic>? user;
  String? errorMessage;

  bool get isAuthenticated => user != null;
  String get role => user?['role']?.toString() ?? 'fan';

  Future<void> boot() async {
    isBooting = true;
    errorMessage = null;
    notifyListeners();

    final token = await _secureStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      isBooting = false;
      notifyListeners();
      return;
    }

    try {
      final response = await _apiClient.get('/users/profile');
      user = Map<String, dynamic>.from(response.data as Map);
    } catch (e) {
      await _secureStorage.clearAll();
      user = null;
    } finally {
      isBooting = false;
      notifyListeners();
    }
  }

  Future<void> refreshProfile() async {
    try {
      final response = await _apiClient.get('/users/profile');
      user = Map<String, dynamic>.from(response.data as Map);
      notifyListeners();
    } catch (e) {
      debugPrint('Error refreshing profile: $e');
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    return _runAuth(() async {
      final response = await _apiClient.post('/auth/login', data: {
        'email': email.trim().toLowerCase(),
        'password': password,
      });
      await _acceptAuthResponse(response.data);
    });
  }

  Future<bool> register({
    required String role,
    required String displayName,
    required String email,
    required String phone,
    required String country,
    required String username,
    required String password,
    String bio = '',
  }) async {
    return startRegistration(
      role: role,
      displayName: displayName,
      email: email,
      phone: phone,
      country: country,
      username: username,
      password: password,
      bio: bio,
    );
  }

  Future<bool> startRegistration({
    required String role,
    required String displayName,
    required String email,
    required String phone,
    required String country,
    required String username,
    required String password,
    String bio = '',
  }) async {
    return _runAuth(() async {
      await _apiClient.post('/auth/register/start', data: {
        'role': role,
        'display_name': displayName.trim(),
        'email': email.trim().toLowerCase(),
        'phone': phone.trim(),
        'country': country.trim(),
        'username': username.trim().toLowerCase(),
        'password': password,
        'bio': bio.trim(),
      });
    });
  }

  Future<bool> verifyRegistration({
    required String email,
    required String code,
  }) async {
    return _runAuth(() async {
      final response = await _apiClient.post('/auth/register/verify', data: {
        'email': email.trim().toLowerCase(),
        'code': code.trim(),
      });
      await _acceptAuthResponse(response.data);
    });
  }

  Future<Map<String, dynamic>> checkUsername(String username) async {
    final clean = username.trim().toLowerCase().replaceFirst('@', '');
    final response = await _apiClient.get('/auth/username/$clean');
    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<void> logout() async {
    await _secureStorage.clearAll();
    user = null;
    notifyListeners();
  }

  Future<bool> _runAuth(Future<void> Function() action) async {
    isLoading = true;
    errorMessage = null;
    notifyListeners();
    try {
      await action();
      return true;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['error'] != null) {
        errorMessage = data['error'].toString();
      } else {
        errorMessage = 'Could not reach the account server.';
      }
      return false;
    } catch (e) {
      errorMessage = 'Something went wrong. Please try again.';
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _acceptAuthResponse(dynamic data) async {
    final payload = Map<String, dynamic>.from(data as Map);
    final token = payload['token']?.toString();
    if (token == null || token.isEmpty) {
      throw StateError('Missing token');
    }
    await _secureStorage.saveAccessToken(token);
    user = Map<String, dynamic>.from(payload['user'] as Map);
  }
}
