import 'dart:io';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'api_client.dart';

@lazySingleton
class CloudinaryService {
  final ApiClient _apiClient;

  CloudinaryService(this._apiClient);

  Future<String> uploadFile(File file, {String? username, String? type}) async {
    // 1. Fetch Cloudinary signature from Go backend
    final Map<String, dynamic> queryParams = {};
    if (username != null) queryParams['username'] = username;
    if (type != null) queryParams['type'] = type;

    final response = await _apiClient.get(
      '/media/cloudinary-signature',
      queryParameters: queryParams,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to get Cloudinary signature from backend');
    }
    
    final data = response.data;
    final String cloudName = data['cloud_name'];
    final String apiKey = data['api_key'];
    final int timestamp = data['timestamp'];
    final String folder = data['folder'];
    final String signature = data['signature'];

    // Determine resource type by extension
    final path = file.path.toLowerCase();
    String resourceType = 'image';
    
    if (path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.avi') || path.endsWith('.mkv')) {
      resourceType = 'video';
    }

    // 2. Prepare Form Data
    final fileName = file.path.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: fileName,
      ),
      'api_key': apiKey,
      'timestamp': timestamp.toString(),
      'signature': signature,
      'folder': folder,
    });

    // 3. Upload directly to Cloudinary
    final uploadResponse = await Dio().post(
      'https://api.cloudinary.com/v1_1/$cloudName/$resourceType/upload',
      data: formData,
    );

    if (uploadResponse.statusCode == 200 || uploadResponse.statusCode == 201) {
      return uploadResponse.data['secure_url'] as String;
    } else {
      throw Exception(uploadResponse.data['error']?['message'] ?? 'Cloudinary upload failed');
    }
  }
}
