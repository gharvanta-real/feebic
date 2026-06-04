import 'api_client.dart';

class PostModel {
  final String id;
  final String creatorId;
  final String content;
  final List<String> mediaUrls;
  final String mediaType;
  final bool isPremium;
  final double price;
  bool isLocked;
  final String createdAt;
  final String creatorUsername;
  final String creatorName;
  final String creatorAvatar;
  int likes;
  int commentsCount;
  bool isLiked;
  bool isBookmarked;
  bool isUnlocked;
  final String status;
  final String visibility;
  final int unlocksCount;
  final String category;

  PostModel({
    required this.id,
    required this.creatorId,
    required this.content,
    required this.mediaUrls,
    required this.mediaType,
    required this.isPremium,
    required this.price,
    required this.isLocked,
    required this.createdAt,
    required this.creatorUsername,
    required this.creatorName,
    required this.creatorAvatar,
    required this.likes,
    required this.commentsCount,
    required this.isLiked,
    required this.isBookmarked,
    required this.isUnlocked,
    required this.status,
    required this.visibility,
    required this.unlocksCount,
    required this.category,
  });

  factory PostModel.fromJson(Map<String, dynamic> json) {
    final rawMediaUrls = json['media_urls'];
    final mediaUrls = rawMediaUrls is List
        ? rawMediaUrls
            .whereType<String>()
            .map(ApiClient.resolveUrl)
            .where((url) => url.isNotEmpty)
            .toList()
        : <String>[];

    return PostModel(
      id: json['id'] ?? '',
      creatorId: json['creator_id'] ?? '',
      content: json['content'] ?? '',
      mediaUrls: mediaUrls,
      mediaType: json['media_type'] ?? '',
      isPremium: json['is_premium'] ?? false,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      isLocked: json['is_locked'] ?? false,
      createdAt: json['created_at'] ?? '',
      creatorUsername: json['creator_username'] ?? '',
      creatorName: json['creator_name'] ?? '',
      creatorAvatar: ApiClient.resolveUrl(json['creator_avatar'] ?? ''),
      likes: json['likes'] ?? 0,
      commentsCount: json['comments_count'] ?? 0,
      isLiked: json['is_liked'] ?? false,
      isBookmarked: json['is_bookmarked'] ?? false,
      isUnlocked: json['is_unlocked'] ?? false,
      status: json['status'] ?? 'published',
      visibility: json['visibility'] ?? 'public',
      unlocksCount: json['unlocks_count'] ?? 0,
      category: json['category'] ?? 'Lifestyle',
    );
  }
}
