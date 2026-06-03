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

  final List<DemoPost> posts = <DemoPost>[];

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
  final List<Map<String, String>> activeSessions = [];

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

  double fanBalance = 0.00;
  double creatorEarnings = 0.00;
  int savedCount = 0;
  int notificationsCount = 0;
  int unreadChats = 0;

  final Set<String> savedPostIds = <String>{};
  final Set<String> unlockedPostIds = <String>{};
  final Set<String> unlockedMessageIds = <String>{};
  final Set<String> subscribedCreators = <String>{};
  final Set<String> creatorAlerts = <String>{};
  final Set<String> blockedCreators = <String>{};
  final List<Map<String, dynamic>> purchasedMedia = <Map<String, dynamic>>[];

  final List<DemoTransaction> fanTransactions = <DemoTransaction>[];

  final List<DemoTransaction> creatorPayouts = <DemoTransaction>[];

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

  /// Public method to notify listeners after externally mutating subscribedCreators
  void notifySubscribersChanged() => notifyListeners();

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
