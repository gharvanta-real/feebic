import 'package:flutter/foundation.dart';

class DemoTransaction {
  DemoTransaction({
    required this.description,
    required this.amount,
    required this.date,
    required this.isAdd,
  });

  final String description;
  final double amount;
  final String date;
  final bool isAdd;
}

class DemoPost {
  final String postId;
  final String username;
  final String avatarUrl;
  final bool isVerified;
  final String caption;
  final String? imageUrl;
  final String? videoUrl;
  final bool isLocked;
  final String? unlockPrice;
  final bool isVideo;
  int likes;
  int comments;

  DemoPost({
    required this.postId,
    required this.username,
    required this.avatarUrl,
    required this.isVerified,
    required this.caption,
    this.imageUrl,
    this.videoUrl,
    required this.isLocked,
    this.unlockPrice,
    required this.isVideo,
    this.likes = 0,
    this.comments = 0,
  });
}

class DemoAppState extends ChangeNotifier {
  DemoAppState._();

  static final DemoAppState instance = DemoAppState._();

  final List<DemoPost> posts = <DemoPost>[
    DemoPost(
      postId: 'feed_alex_art_1',
      username: 'alexandra_art',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      isVerified: true,
      caption:
          'Working on a new digital canvas piece today. Check out my short video trailer preview.',
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      videoUrl:
          'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Npa3JzMDl2dHpxMXptcmQ1b3hxdTkybnF4MDFpOHFhc2I2anZ0dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41Yc2nICfMnsgfa8/giphy.gif',
      isVideo: true,
      likes: 1243,
      comments: 48,
      isLocked: false,
    ),
    DemoPost(
      postId: 'feed_premium_clicks_1',
      username: 'premium_clicks',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      isVerified: false,
      caption:
          'Behind the scenes travel vlog video. Unlock to see the full length premium video file!',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      videoUrl:
          'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGx0MmJ3aDVndThqN3I0ZzRsMGZsdHZ2cjhkZHAzYm42Y25odWN1NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1AgGfR18U6da3o9J1B/giphy.gif',
      isLocked: true,
      isVideo: true,
      unlockPrice: 'Rs 799',
      likes: 420,
      comments: 12,
    ),
  ];

  void addPost(DemoPost post) {
    posts.insert(0, post);
    notifyListeners();
  }

  // Fan Profile State (Visitor)
  String fanName = 'Mark Daniels';
  String fanUsername = 'mark_daniels';
  String fanBio = 'Premium Content Subscriber & Fitness Fanatic';
  String fanEmail = 'mark.daniels@gmail.com';
  String fanPhone = '+1 (555) 019-2834';
  String fanAvatar =
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde';

  // Creator Profile State
  String creatorName = 'Lucia Fernandez';
  String creatorUsername = 'lucia_fit';
  String creatorBio =
      'Yoga Trainer & Daily Nutrition Tips\nCheck my locked feed below for VIP videos.';
  String creatorLink = 'linktr.ee/lucia_fit';
  String creatorCategory = 'Health & Fitness';
  String creatorAvatar =
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1';
  double creatorSubscriptionPrice = 399.0;

  // Active Sessions State (For Security Subpage)
  final List<Map<String, String>> activeSessions = [
    {
      'id': 'session_1',
      'device': 'iPhone 15 Pro Max',
      'location': 'New Delhi, IN',
      'ip': '192.168.1.45',
      'status': 'Active now',
    },
    {
      'id': 'session_2',
      'device': 'MacBook Pro 16"',
      'location': 'Mumbai, IN',
      'ip': '103.241.12.89',
      'status': 'Last active 2 hrs ago',
    },
    {
      'id': 'session_3',
      'device': 'Safari on iPad Pro',
      'location': 'Noida, IN',
      'ip': '172.56.21.110',
      'status': 'Last active 3 days ago',
    },
  ];

  // Bank & Payouts details (For stripe payouts setup)
  String bankAccountName = '';
  String bankAccountNumber = '';
  String bankRoutingNumber = '';
  String bankName = '';
  bool isBankConnected = false;

  void updateFanProfile({
    String? name,
    String? bio,
    String? email,
    String? phone,
  }) {
    if (name != null) fanName = name;
    if (bio != null) fanBio = bio;
    if (email != null) fanEmail = email;
    if (phone != null) fanPhone = phone;
    notifyListeners();
  }

  void updateCreatorProfile({
    String? name,
    String? bio,
    String? link,
    String? category,
  }) {
    if (name != null) creatorName = name;
    if (bio != null) creatorBio = bio;
    if (link != null) creatorLink = link;
    if (category != null) creatorCategory = category;
    notifyListeners();
  }

  void updateSubscriptionPrice(double price) {
    creatorSubscriptionPrice = price;
    notifyListeners();
  }

  void configureBank({
    required String accountName,
    required String accountNumber,
    required String routingNumber,
    required String bank,
  }) {
    bankAccountName = accountName;
    bankAccountNumber = accountNumber;
    bankRoutingNumber = routingNumber;
    bankName = bank;
    isBankConnected = true;
    notifyListeners();
  }

  void terminateSession(String sessionId) {
    activeSessions.removeWhere((session) => session['id'] == sessionId);
    notifyListeners();
  }

  double fanBalance = 4500.00;
  double creatorEarnings = 142450.00;
  int savedCount = 0;
  int notificationsCount = 3;
  int unreadChats = 1;

  final Set<String> savedPostIds = <String>{};
  final Set<String> unlockedPostIds = <String>{};
  final Set<String> unlockedMessageIds = <String>{};
  final Set<String> subscribedCreators = <String>{};
  final Set<String> creatorAlerts = <String>{};
  final Set<String> blockedCreators = <String>{};
  final List<Map<String, dynamic>> purchasedMedia = <Map<String, dynamic>>[
    {
      'id': 'pur_1',
      'image': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      'creator': 'alexandra_art',
      'caption': 'Working on a new digital canvas piece today!',
      'date': 'May 28, 2026',
    },
    {
      'id': 'pur_2',
      'image': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
      'creator': 'chef_gabriel',
      'caption': 'Wood-fired sourdough pizza from scratch!',
      'date': 'May 12, 2026',
    },
  ];

  final List<DemoTransaction> fanTransactions = <DemoTransaction>[
    DemoTransaction(
        description: 'Subscribed to @lucia_fit',
        amount: -799.00,
        date: 'June 1, 2026',
        isAdd: false),
    DemoTransaction(
        description: 'Unlocked Post from @alexandra_art',
        amount: -399.00,
        date: 'May 28, 2026',
        isAdd: false),
    DemoTransaction(
        description: 'Wallet Deposit',
        amount: 5000.00,
        date: 'May 25, 2026',
        isAdd: true),
  ];

  final List<DemoTransaction> creatorPayouts = <DemoTransaction>[
    DemoTransaction(
        description: 'Payout Completed (Bank Transfer)',
        amount: -120000.00,
        date: 'May 15, 2026',
        isAdd: false),
    DemoTransaction(
        description: 'Payout Completed (Bank Transfer)',
        amount: -94000.00,
        date: 'April 15, 2026',
        isAdd: false),
  ];

  void markNotificationsSeen() {
    notificationsCount = 0;
    notifyListeners();
  }

  void markChatsRead() {
    unreadChats = 0;
    notifyListeners();
  }

  bool toggleSaved(String postId) {
    final isSaved = savedPostIds.contains(postId);
    if (isSaved) {
      savedPostIds.remove(postId);
    } else {
      savedPostIds.add(postId);
    }
    savedCount = savedPostIds.length;
    notifyListeners();
    return !isSaved;
  }

  bool toggleSubscribe(String creatorUsername) {
    final isSubscribed = subscribedCreators.contains(creatorUsername);
    if (isSubscribed) {
      subscribedCreators.remove(creatorUsername);
    } else {
      subscribedCreators.add(creatorUsername);
    }
    notifyListeners();
    return !isSubscribed;
  }

  bool toggleAlerts(String creatorUsername) {
    final hasAlert = creatorAlerts.contains(creatorUsername);
    if (hasAlert) {
      creatorAlerts.remove(creatorUsername);
    } else {
      creatorAlerts.add(creatorUsername);
    }
    notifyListeners();
    return !hasAlert;
  }

  bool toggleBlock(String creatorUsername) {
    final isBlocked = blockedCreators.contains(creatorUsername);
    if (isBlocked) {
      blockedCreators.remove(creatorUsername);
    } else {
      blockedCreators.add(creatorUsername);
    }
    notifyListeners();
    return !isBlocked;
  }

  bool unlockPost({
    required String id,
    required double price,
    required String image,
    required String creator,
    required String caption,
  }) {
    if (unlockedPostIds.contains(id)) return true;
    if (fanBalance < price) return false;

    fanBalance -= price;
    creatorEarnings += price;
    unlockedPostIds.add(id);
    fanTransactions.insert(
      0,
      DemoTransaction(
          description: 'Unlocked Post from @$creator',
          amount: -price,
          date: 'Just now',
          isAdd: false),
    );
    purchasedMedia.insert(0, {
      'id': 'pur_${DateTime.now().millisecondsSinceEpoch}',
      'image': image,
      'creator': creator,
      'caption': caption,
      'date': 'Just now',
    });
    notifyListeners();
    return true;
  }

  bool unlockPpvMessage(String id, double price, String creator) {
    if (unlockedMessageIds.contains(id)) return true;
    if (fanBalance < price) return false;
    fanBalance -= price;
    creatorEarnings += price;
    unlockedMessageIds.add(id);
    fanTransactions.insert(
        0,
        DemoTransaction(
          description: 'Unlocked Message from @$creator',
          amount: -price,
          date: 'Just now',
          isAdd: false,
        ));
    notifyListeners();
    return true;
  }

  void addFunds(double amount) {
    fanBalance += amount;
    fanTransactions.insert(
      0,
      DemoTransaction(
          description: 'Wallet Deposit',
          amount: amount,
          date: 'Just now',
          isAdd: true),
    );
    notifyListeners();
  }

  bool requestPayout(double amount) {
    if (amount <= 0 || amount > creatorEarnings) return false;
    creatorEarnings -= amount;
    creatorPayouts.insert(
      0,
      DemoTransaction(
          description: 'Payout Requested (Bank Transfer)',
          amount: -amount,
          date: 'Just now',
          isAdd: false),
    );
    notifyListeners();
    return true;
  }
}
