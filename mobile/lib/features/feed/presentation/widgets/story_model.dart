class CreatorStoryModel {
  final String username;
  final String name;
  final String avatar;
  final List<StorySlideModel> slides;
  bool isUnread;

  CreatorStoryModel({
    required this.username,
    required this.name,
    required this.avatar,
    required this.slides,
    this.isUnread = false,
  });

  factory CreatorStoryModel.fromJson(Map<String, dynamic> json) {
    final slidesList = (json['items'] as List? ?? [])
        .map((item) => StorySlideModel.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
    return CreatorStoryModel(
      username: (json['username'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      avatar: (json['avatar'] ?? '').toString(),
      isUnread: json['isUnread'] == true,
      slides: slidesList,
    );
  }
}

class StorySlideModel {
  final String id;
  final String url;
  final String time;
  final String location;

  StorySlideModel({
    required this.id,
    required this.url,
    required this.time,
    required this.location,
  });

  factory StorySlideModel.fromJson(Map<String, dynamic> json) {
    return StorySlideModel(
      id: (json['id'] ?? '').toString(),
      url: (json['storyUrl'] ?? json['story_url'] ?? '').toString(),
      time: (json['time'] ?? '').toString(),
      location: (json['location'] ?? '').toString(),
    );
  }
}
