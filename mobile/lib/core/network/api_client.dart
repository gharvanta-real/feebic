import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import '../storage/secure_storage.dart';
import 'package:flutter/foundation.dart';

@lazySingleton
class ApiClient {
  final Dio dio;
  final SecureStorage _secureStorage;

  // Change this to your production backend URL or local API URL.
  // 10.0.2.2 is the IP address Android Emulator uses to access the host machine's localhost.
  static const String _defaultBaseUrl =
      kDebugMode ? 'http://10.0.2.2:3000/api' : 'https://api.feebic.com/api';

  ApiClient(this._secureStorage)
      : dio = Dio(
          BaseOptions(
            baseUrl: _defaultBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Retrieve the access token from secure storage and append it
          final token = await _secureStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Handle 401 Unauthorized globally (e.g., token expired)
          if (error.response?.statusCode == 401) {
            // TODO: Trigger token refresh logic using Clerk refresh token if needed,
            // or dispatch user logout event.
          }
          return handler.next(error);
        },
      ),
    );

    // Logging Interceptor for Debugging (equivalent to Network tab)
    if (kDebugMode) {
      dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (object) => debugPrint('[API LOG]: $object'),
        ),
      );
    }
  }

  // Common wrapper methods
  Future<Response> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    return await dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) async {
    return await dio.put(path, data: data);
  }

  Future<Response> delete(String path, {dynamic data}) async {
    return await dio.delete(path, data: data);
  }
}
