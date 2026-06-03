import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:felbic_mobile/core/storage/secure_storage.dart';
import 'package:flutter/foundation.dart';

@lazySingleton
class ApiClient {
  final Dio dio;
  final SecureStorage _secureStorage;

  static const String _defaultBaseUrls = String.fromEnvironment(
    'API_BASE_URLS',
    defaultValue:
        'http://10.0.2.2:8081/api,http://127.0.0.1:8081/api,https://api.felbic.gharvanta.in/api',
  );

  static List<String> get _baseUrls {
    final list = _defaultBaseUrls
        .split(',')
        .map((url) => url.trim().replaceFirst(RegExp(r'/+$'), ''))
        .where((url) => url.isNotEmpty)
        .toList();
    if (kReleaseMode) {
      // Prioritize the production HTTPS endpoint in release mode
      final prodIndex = list.indexWhere((url) => url.startsWith('https://'));
      if (prodIndex != -1) {
        final prodUrl = list.removeAt(prodIndex);
        list.insert(0, prodUrl);
      }
    }
    return list;
  }

  static String get _defaultBaseUrl => _baseUrls.isNotEmpty
      ? _baseUrls.first
      : 'https://api.felbic.gharvanta.in/api';

  static String resolveUrl(String url) {
    if (url.isEmpty ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:')) {
      return url;
    }

    final origin = _defaultBaseUrl.replaceFirst(RegExp(r'/api/?$'), '');
    if (url.startsWith('/')) {
      return '$origin$url';
    }
    return url;
  }

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
            // TODO: Trigger token refresh or dispatch user logout when needed,
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
    return await _withFallback(
      (client) => client.get(path, queryParameters: queryParameters),
    );
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await _withFallback((client) => client.post(path, data: data));
  }

  Future<Response> put(String path, {dynamic data}) async {
    return await _withFallback((client) => client.put(path, data: data));
  }

  Future<Response> delete(String path, {dynamic data}) async {
    return await _withFallback((client) => client.delete(path, data: data));
  }

  Future<Response> _withFallback(
    Future<Response> Function(Dio client) request,
  ) async {
    DioException? lastDioError;
    Object? lastError;

    for (final baseUrl in _baseUrls) {
      dio.options.baseUrl = baseUrl;
      try {
        return await request(dio);
      } on DioException catch (error) {
        lastDioError = error;
        final code = error.response?.statusCode ?? 0;
        final canRetry = error.type == DioExceptionType.connectionError ||
            error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            code >= 500;

        if (!canRetry) {
          rethrow;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (lastDioError != null) {
      throw lastDioError;
    }
    throw lastError ?? StateError('Unable to reach Felbic API');
  }
}
