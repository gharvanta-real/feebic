// Client-Side Mock Database for CreatorHub
// Persists state in localStorage to sync data between different pages

const DEFAULT_CREATORS = {
  lanarhoades: {
    name: "Lana Rhoades",
    username: "lanarhoades",
    avatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    cover: "/assets/082f4723389abb44b68b64dfc082268b.png",
    bio: "Hey guys! Welcome to my official page! 💕 Daily updates, exclusive sets, and chats.",
    location: "Los Angeles, USA",
    website: "lanarhoades.fans",
    likes: "1.2M",
    subPrice: 12.99,
    verified: true,
    tag: "Lifestyle",
    fansCount: "1.2M fans"
  },
  demirose: {
    name: "Demi Rose",
    username: "demirose",
    avatar: "/assets/0c0bf4c58678d852ea7588ef1045309e.png",
    cover: "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
    bio: "Spiritual being. ☀️ Grateful for this beautiful life. Sharing my travels, photosets, and love with you all. ❤️",
    location: "Ibiza, Spain",
    website: "demirose.fans",
    likes: "980K",
    subPrice: 14.99,
    verified: true,
    tag: "Photography",
    fansCount: "980K fans"
  },
  amouranth: {
    name: "Amouranth",
    username: "amouranth",
    avatar: "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png",
    cover: "/assets/33835d122eba2ad097de797e914a7b1b.png",
    bio: "Gamer, ASMR artist, and cosplayer! 🕹️ Daily interactive streams, behind-the-scenes, and messages.",
    location: "Houston, USA",
    website: "amouranth.fans",
    likes: "890K",
    subPrice: 11.99,
    verified: true,
    tag: "Cosplay",
    fansCount: "890K fans"
  },
  bhadbhabie: {
    name: "Bhad Bhabie",
    username: "bhadbhabie",
    avatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
    cover: "/assets/384e38f674b42a41275c38fdadba8551.png",
    bio: "You already know who it is. 🤫 Keep up with my music, photosets, and exclusive content here.",
    location: "Miami, USA",
    website: "bhadbhabie.fans",
    likes: "765K",
    subPrice: 19.99,
    verified: true,
    tag: "Art",
    fansCount: "765K fans"
  },
  nicolethorne: {
    name: "Nicole Thorne",
    username: "nicolethorne",
    avatar: "/assets/be708ecefc41b969ee64c477f954168c.png",
    cover: "/assets/be708ecefc41b969ee64c477f954168c.png",
    bio: "Australian model. 🐨 sharing lifestyle, photography, and premium updates daily.",
    location: "Sydney, Australia",
    website: "nicolethorne.fans",
    likes: "640K",
    subPrice: 8.99,
    verified: true,
    tag: "Lifestyle",
    fansCount: "640K fans"
  },
  austinwolf: {
    name: "Austin Wolf",
    username: "austinwolf",
    avatar: "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
    cover: "/assets/2e276540ed6f162458a34e8dc8f3f271.png",
    bio: "Certified bodybuilding coach & fitness trainer. Weekly exercise guides, tips, and full gym workouts! 💪🏋️‍♂️",
    location: "Los Angeles, USA",
    website: "austinwolf.fitness",
    likes: "320K",
    subPrice: 9.99,
    verified: true,
    tag: "Fitness",
    fansCount: "320K fans"
  }
};

const DEFAULT_POSTS = [
  {
    id: "post_lana_1",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/082f4723389abb44b68b64dfc082268b.png",
    mediaUrls: [
      "/assets/082f4723389abb44b68b64dfc082268b.png",
      "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
      "/assets/26ad03d14c762b66bec524c5aeb135d6.png",
      "/assets/2e276540ed6f162458a34e8dc8f3f271.png",
      "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png",
      "/assets/33835d122eba2ad097de797e914a7b1b.png",
      "/assets/384e38f674b42a41275c38fdadba8551.png",
      "/assets/39bc5c3eed51d62c1022c60686bb459a.png"
    ],
    mediaType: "image",
    content: "New photoset just dropped! 💕 Check it out now on my page 🥵",
    likes: 1800,
    commentsCount: 156,
    time: "2h ago",
    isPremium: true,
    price: 12.99
  },
  {
    id: "post_demi_1",
    creatorUsername: "demirose",
    creatorName: "Demi Rose",
    creatorAvatar: "/assets/0c0bf4c58678d852ea7588ef1045309e.png",
    isPinned: false,
    mediaUrl: "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
    mediaUrls: [
      "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
      "/assets/26ad03d14c762b66bec524c5aeb135d6.png",
      "/assets/33835d122eba2ad097de797e914a7b1b.png",
      "/assets/3a8c80ddb65a96799f1bed3d270ba06d.png",
      "/assets/be708ecefc41b969ee64c477f954168c.png",
      "/assets/cb15617a79d7713ffa4a6de36f808a76.png"
    ],
    mediaType: "image",
    content: "Beach day ☀️ Love spending time with you all! ❤️",
    likes: 2500,
    commentsCount: 214,
    time: "4h ago",
    isPremium: true,
    price: 14.99
  },
  {
    id: "post_austin_1",
    creatorUsername: "austinwolf",
    creatorName: "Austin Wolf",
    creatorAvatar: "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
    isPinned: false,
    mediaUrl: "/assets/65c7978e64c060567de19aa63c97dfe7.png",
    mediaUrls: [
      "/assets/65c7978e64c060567de19aa63c97dfe7.png",
      "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
      "/assets/5f4af64d6209da2ba65216d40964d9fb.png",
      "/assets/efcfd91838f89a7a1dcef9eac6ec0b56.png",
      "/assets/f60376998a1bb7da8ac3bb8540d974a8.png"
    ],
    mediaType: "video",
    content: "Chest & Arms pump 💪 Full workout video now live!",
    likes: 1100,
    commentsCount: 98,
    time: "6h ago",
    isPremium: true,
    price: 9.99
  }
];

const DEFAULT_CHATS = {
  "lanarhoades": [
    { id: "msg_1", sender: "lanarhoades", text: "Hey! Thanks for stopping by. Check my page out, new photo sets dropping regularly! 😘", time: "11:02 AM" }
  ],
  "demirose": [
    { id: "msg_s1", sender: "demirose", text: "Hey Alex! Thanks for subscribing. Let's chat and share beautiful vibes! ☀️❤️", time: "Yesterday" }
  ]
};

// Database class
class MockDatabase {
  constructor() {
    this.init();
  }

  init() {
    const CURRENT_DB_VERSION = "creatorhub_v3";
    if (localStorage.getItem("ch_db_version") !== CURRENT_DB_VERSION) {
      localStorage.removeItem("ch_subscriptions");
      localStorage.removeItem("ch_posts");
      localStorage.removeItem("ch_chats");
      localStorage.removeItem("ch_unlocked");
      localStorage.removeItem("ch_bookmarks");
      localStorage.removeItem("ch_liked_posts");
      localStorage.removeItem("ch_post_comments");
      localStorage.removeItem("ch_stories");
      localStorage.removeItem("ch_notifications");
      localStorage.setItem("ch_db_version", CURRENT_DB_VERSION);
    }

    if (!localStorage.getItem("ch_subscriptions")) {
      localStorage.setItem("ch_subscriptions", JSON.stringify(["nicolethorne"])); 
    }
    if (!localStorage.getItem("ch_posts")) {
      localStorage.setItem("ch_posts", JSON.stringify(DEFAULT_POSTS));
    }
    if (!localStorage.getItem("ch_chats")) {
      localStorage.setItem("ch_chats", JSON.stringify(DEFAULT_CHATS));
    }
    if (!localStorage.getItem("ch_unlocked")) {
      localStorage.setItem("ch_unlocked", JSON.stringify([])); // array of unlocked post/msg ids
    }
    if (!localStorage.getItem("ch_earnings")) {
      localStorage.setItem("ch_earnings", "14280.50");
    }
    if (!localStorage.getItem("ch_subscribers")) {
      localStorage.setItem("ch_subscribers", "1248");
    }
    if (!localStorage.getItem("ch_bookmarks")) {
      localStorage.setItem("ch_bookmarks", JSON.stringify(["post_lana_1"]));
    }
    if (!localStorage.getItem("ch_liked_posts")) {
      localStorage.setItem("ch_liked_posts", JSON.stringify([]));
    }
    if (!localStorage.getItem("ch_wallet_balance")) {
      localStorage.setItem("ch_wallet_balance", "450.00");
    }
    if (!localStorage.getItem("ch_transactions")) {
      const DEFAULT_TRANSACTIONS = [
        { id: "tx_1", type: "tip", title: "Tip to Lana Rhoades", subtitle: "May 30, 2026 • @lanarhoades", amount: -10.00 },
        { id: "tx_2", type: "withdrawal", title: "Payout to Bank ****1234", subtitle: "May 28, 2026 • Completed", amount: 250.00 },
        { id: "tx_3", type: "subscription", title: "Subscription renewal: Austin Wolf", subtitle: "May 25, 2026 • @austinwolf", amount: -9.99 }
      ];
      localStorage.setItem("ch_transactions", JSON.stringify(DEFAULT_TRANSACTIONS));
    }
    
    // User credentials (Alex Rivera)
    if (!localStorage.getItem("ch_user_display_name")) {
      localStorage.setItem("ch_user_display_name", "Alex Rivera");
    }
    if (!localStorage.getItem("ch_user_username")) {
      localStorage.setItem("ch_user_username", "arivera");
    }
    if (!localStorage.getItem("ch_user_bio")) {
      localStorage.setItem("ch_user_bio", "A creative professional building premium software.");
    }
    if (!localStorage.getItem("ch_user_avatar")) {
      localStorage.setItem("ch_user_avatar", "/assets/5dc72593d711173af1fe7ab74be0fa56.png");
    }
    
    if (!localStorage.getItem("ch_post_comments")) {
      const DEFAULT_COMMENTS = {
        "post_lana_1": [
          { id: "c_1", username: "demirose", name: "Demi Rose", avatar: "/assets/0c0bf4c58678d852ea7588ef1045309e.png", text: "Stunning, my love! 🔥💕", time: "2h ago" },
          { id: "c_2", username: "amouranth", name: "Amouranth", avatar: "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png", text: "Incredible shot! 😍", time: "1h ago" }
        ],
        "post_demi_1": [
          { id: "c_3", username: "lanarhoades", name: "Lana Rhoades", avatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png", text: "Wow, actual angel! 👼☀️", time: "4h ago" },
          { id: "c_4", username: "nicolethorne", name: "Nicole Thorne", avatar: "/assets/be708ecefc41b969ee64c477f954168c.png", text: "Unbelievable views! 🌊", time: "3h ago" }
        ],
        "post_austin_1": [
          { id: "c_5", username: "demirose", name: "Demi Rose", avatar: "/assets/0c0bf4c58678d852ea7588ef1045309e.png", text: "Crushing it, Austin! 💪", time: "4h ago" }
        ]
      };
      localStorage.setItem("ch_post_comments", JSON.stringify(DEFAULT_COMMENTS));
    }
    let hasLegacyStories = false;
    try {
      const existing = JSON.parse(localStorage.getItem("ch_stories") || "[]");
      if (existing.length > 0 && !existing[0].items) {
        hasLegacyStories = true;
      }
    } catch(e) {}

    if (!localStorage.getItem("ch_stories") || hasLegacyStories) {
      const DEFAULT_STORIES = [
        {
          username: "lanarhoades",
          name: "Lana R.",
          avatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
          isUnread: true,
          items: [
            { id: "lana_s1", storyUrl: "/assets/082f4723389abb44b68b64dfc082268b.png", time: "2h ago", location: "Miami Beach" },
            { id: "lana_s2", storyUrl: "/assets/0c0bf4c58678d852ea7588ef1045309e.png", time: "1h ago", location: "Golden Gate" }
          ]
        },
        {
          username: "demirose",
          name: "Demi Rose",
          avatar: "/assets/0c0bf4c58678d852ea7588ef1045309e.png",
          isUnread: true,
          items: [
            { id: "demi_s1", storyUrl: "/assets/1b01065d7e887ce3d8b379aabd6221a2.png", time: "4h ago", location: "London, UK" },
            { id: "demi_s2", storyUrl: "/assets/26ad03d14c762b66bec524c5aeb135d6.png", time: "3h ago", location: "Paris, France" }
          ]
        },
        {
          username: "amouranth",
          name: "Amouranth",
          avatar: "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png",
          isUnread: true,
          items: [
            { id: "amour_s1", storyUrl: "/assets/33835d122eba2ad097de797e914a7b1b.png", time: "5h ago", location: "Houston, TX" }
          ]
        },
        {
          username: "bhadbhabie",
          name: "Bhad Bhabie",
          avatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
          isUnread: true,
          items: [
            { id: "bhad_s1", storyUrl: "/assets/3a8c80ddb65a96799f1bed3d270ba06d.png", time: "7h ago" },
            { id: "bhad_s2", storyUrl: "/assets/3bb70096eea316455e8aef5ee2e178a7.png", time: "6h ago" }
          ]
        },
        {
          username: "nicolethorne",
          name: "Nicole Thorne",
          avatar: "/assets/be708ecefc41b969ee64c477f954168c.png",
          isUnread: true,
          items: [
            { id: "nicole_s1", storyUrl: "/assets/be708ecefc41b969ee64c477f954168c.png", time: "9h ago", location: "Sydney, Australia" }
          ]
        }
      ];
      localStorage.setItem("ch_stories", JSON.stringify(DEFAULT_STORIES));
    }
    if (!localStorage.getItem("ch_notifications")) {
      const DEFAULT_NOTIFICATIONS = [
        {
          id: "notif_1",
          type: "subscribe",
          senderName: "Sarah J.",
          senderAvatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
          text: "subscribed to your profile",
          time: "2 hours ago",
          read: false
        },
        {
          id: "notif_2",
          type: "tip",
          senderName: "Sarah Jenkins",
          senderAvatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
          text: "tipped you",
          amount: 25.00,
          time: "5 hours ago",
          read: false
        },
        {
          id: "notif_3",
          type: "like",
          senderName: "Sarah J.",
          senderAvatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
          text: "liked your post",
          time: "1 day ago",
          read: true
        },
        {
          id: "notif_4",
          type: "comment",
          senderName: "John Smith",
          senderAvatar: "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
          text: "commented: 'Amazing walkthrough video!'",
          time: "2 days ago",
          read: true
        }
      ];
      localStorage.setItem("ch_notifications", JSON.stringify(DEFAULT_NOTIFICATIONS));
    }

    if (!localStorage.getItem("ch_blocked_users")) {
      localStorage.setItem("ch_blocked_users", JSON.stringify(["spammer123", "troll_king"]));
    }
    if (!localStorage.getItem("ch_favorite_creators")) {
      localStorage.setItem("ch_favorite_creators", JSON.stringify([]));
    }
    if (!localStorage.getItem("ch_vault")) {
      const DEFAULT_VAULT = [
        { id: "v_1", name: "BTS Video Capture.mp4", url: "/assets/65c7978e64c060567de19aa63c97dfe7.png", type: "video", date: "May 29, 2026", size: "24.5 MB", usageCount: 2 },
        { id: "v_2", name: "Nocturnal Space landscape.jpg", url: "/assets/0c0bf4c58678d852ea7588ef1045309e.png", type: "image", date: "May 28, 2026", size: "4.2 MB", usageCount: 3 },
        { id: "v_3", name: "Studio Sketchbook speedpaint.jpg", url: "/assets/2e276540ed6f162458a34e8dc8f3f271.png", type: "image", date: "May 27, 2026", size: "3.8 MB", usageCount: 1 },
        { id: "v_4", name: "Workout split breakdown.png", url: "/assets/5dc72593d711173af1fe7ab74be0fa56.png", type: "image", date: "May 25, 2026", size: "2.1 MB", usageCount: 0 }
      ];
      localStorage.setItem("ch_vault", JSON.stringify(DEFAULT_VAULT));
    }
  }

  // Blocked Users API
  getBlockedUsers() {
    return JSON.parse(localStorage.getItem("ch_blocked_users") || "[]");
  }

  isBlocked(username) {
    if (!username) return false;
    const clean = username.replace("@", "");
    return this.getBlockedUsers().includes(clean);
  }

  toggleBlockUser(username) {
    if (!username) return false;
    const clean = username.replace("@", "");
    let blocked = this.getBlockedUsers();
    if (blocked.includes(clean)) {
      blocked = blocked.filter(u => u !== clean);
    } else {
      blocked.push(clean);
      // Unsubscribe from creator when blocked
      this.unsubscribe(clean);
    }
    localStorage.setItem("ch_blocked_users", JSON.stringify(blocked));
    window.dispatchEvent(new CustomEvent("ch_blocked_users_updated", { detail: { username: clean } }));
    return blocked.includes(clean);
  }

  // Favorite Creators API
  getFavoriteCreators() {
    return JSON.parse(localStorage.getItem("ch_favorite_creators") || "[]");
  }

  isFavoriteCreator(username) {
    if (!username) return false;
    const clean = username.replace("@", "");
    return this.getFavoriteCreators().includes(clean);
  }

  toggleFavoriteCreator(username) {
    if (!username) return false;
    const clean = username.replace("@", "");
    let favorites = this.getFavoriteCreators();
    let isFav = false;
    if (favorites.includes(clean)) {
      favorites = favorites.filter(u => u !== clean);
    } else {
      favorites.push(clean);
      isFav = true;
    }
    localStorage.setItem("ch_favorite_creators", JSON.stringify(favorites));
    window.dispatchEvent(new CustomEvent("ch_favorite_creators_updated", { detail: { username: clean, isFavorite: isFav } }));
    return isFav;
  }

  // Creators Listing API
  getCreators() {
    return DEFAULT_CREATORS;
  }

  getCreator(username) {
    const clean = username.replace("@", "");
    return DEFAULT_CREATORS[clean] || null;
  }

  // Subscriptions
  getSubscriptions() {
    return JSON.parse(localStorage.getItem("ch_subscriptions") || "[]");
  }

  isSubscribed(creatorUsername) {
    const username = creatorUsername.replace("@", "");
    return this.getSubscriptions().includes(username);
  }

  unsubscribe(creatorUsername) {
    const username = creatorUsername.replace("@", "");
    let subs = this.getSubscriptions();
    if (subs.includes(username)) {
      subs = subs.filter(u => u !== username);
      localStorage.setItem("ch_subscriptions", JSON.stringify(subs));
      
      // Update subscriber count
      let currentSubs = parseInt(localStorage.getItem("ch_subscribers")) || 1248;
      localStorage.setItem("ch_subscribers", Math.max(0, currentSubs - 1).toString());
      window.dispatchEvent(new CustomEvent("ch_subscriptions_updated"));
    }
  }

  subscribe(creatorUsername, price = 0) {
    const username = creatorUsername.replace("@", "");
    const subs = this.getSubscriptions();
    if (!subs.includes(username)) {
      // If blocked, we cannot subscribe!
      if (this.isBlocked(username)) return;

      subs.push(username);
      localStorage.setItem("ch_subscriptions", JSON.stringify(subs));
      
      // Deduct from wallet balance
      if (price > 0) {
        this.adjustWalletBalance(-price, `Subscription to @${username}`, username);
      }
      
      // Update subscriber count
      let currentSubs = parseInt(localStorage.getItem("ch_subscribers")) || 1248;
      localStorage.setItem("ch_subscribers", (currentSubs + 1).toString());
      window.dispatchEvent(new CustomEvent("ch_subscriptions_updated"));
    }
  }

  // Wallet and Balance API
  getWalletBalance() {
    return parseFloat(localStorage.getItem("ch_wallet_balance") || "450.00");
  }

  getTransactions() {
    return JSON.parse(localStorage.getItem("ch_transactions") || "[]");
  }

  adjustWalletBalance(amount, title, creatorUsername = "") {
    const current = this.getWalletBalance();
    const updated = Math.max(0, current + parseFloat(amount));
    localStorage.setItem("ch_wallet_balance", updated.toFixed(2));
    
    // Add transaction record
    const transactions = this.getTransactions();
    const cleanUsername = creatorUsername ? creatorUsername.replace("@", "") : "";
    const tx = {
      id: "tx_" + Date.now(),
      type: amount < 0 ? (title.toLowerCase().includes("sub") ? "subscription" : "tip") : "funds",
      title: title,
      subtitle: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (cleanUsername ? ` • @${cleanUsername}` : ""),
      amount: parseFloat(amount)
    };
    transactions.unshift(tx);
    localStorage.setItem("ch_transactions", JSON.stringify(transactions));
    
    window.dispatchEvent(new CustomEvent("ch_wallet_updated", { detail: { balance: updated, transaction: tx } }));
    return updated;
  }

  // Chats & Messaging
  getChats(creatorUsername) {
    const chats = JSON.parse(localStorage.getItem("ch_chats") || "{}");
    return chats[creatorUsername] || [];
  }

  sendMessage(creatorUsername, text, isPPV = false, price = 0, mediaUrl = "", mediaType = "image") {
    const chats = JSON.parse(localStorage.getItem("ch_chats") || "{}");
    if (!chats[creatorUsername]) {
      chats[creatorUsername] = [];
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: text,
      time: time,
      isPPV,
      price,
      mediaUrl,
      mediaType
    };

    chats[creatorUsername].push(newMsg);
    localStorage.setItem("ch_chats", JSON.stringify(chats));
    
    // Trigger message loaded event in UI
    window.dispatchEvent(new CustomEvent("ch_message_sent"));

    // Simulate creator auto-reply after 1.5s
    const creator = this.getCreator(creatorUsername);
    if (creator) {
      setTimeout(() => {
        const updatedChats = JSON.parse(localStorage.getItem("ch_chats") || "{}");
        if (!updatedChats[creatorUsername]) updatedChats[creatorUsername] = [];
        
        let replyText = `Thanks for writing! Sending you love. ❤️`;
        if (creator.tag === "Photography") {
          replyText = `Hey there! Thank you so much for the message. I'm busy editing my nocturnal landscape prints today, but I'll get back to you shortly! 🌌📸`;
        } else if (creator.tag === "Art") {
          replyText = `Hey! Thanks for messaging. I'm currently recording a new speed-painting tutorial for my backstage tiers. Let me know if you want custom commissions! 🎨✨`;
        } else if (creator.tag === "Fitness") {
          replyText = `Boom! What's up? I'm hitting the gym for my leg workout split right now. Keep crushing your macros, I'll reply to questions soon! 💪🔥`;
        } else if (creator.tag === "Cosplay") {
          replyText = `Hiii! Thanks for the DM. Custom photoshoots and outfit requests are open! Let me know if you want custom costume guides! 🕹️🌟`;
        } else if (creator.tag === "Lifestyle") {
          replyText = `Hello! So happy to connect with you. I'm heading out to explore a new local market in London today, but I'll reply to DMs as soon as I'm back! ✨🍽️`;
        }
        
        const replyMsg = {
          id: "msg_" + (Date.now() + 1),
          sender: creatorUsername,
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        updatedChats[creatorUsername].push(replyMsg);
        localStorage.setItem("ch_chats", JSON.stringify(updatedChats));
        
        // Dispatch custom event to notify active chat page to reload messages
        window.dispatchEvent(new CustomEvent("ch_message_received"));
      }, 1500);
    }

    return newMsg;
  }

  // Unlocking Premium Content
  isUnlocked(id) {
    const unlocked = JSON.parse(localStorage.getItem("ch_unlocked") || "[]");
    return unlocked.includes(id);
  }

  unlockContent(id, price) {
    const unlocked = JSON.parse(localStorage.getItem("ch_unlocked") || "[]");
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      localStorage.setItem("ch_unlocked", JSON.stringify(unlocked));

      // Deduct from wallet balance
      this.adjustWalletBalance(-price, `Unlock Premium Message`, "");

      // Add to platform/creator earnings
      let currentEarnings = parseFloat(localStorage.getItem("ch_earnings") || "14280.50");
      localStorage.setItem("ch_earnings", (currentEarnings + parseFloat(price)).toFixed(2));
    }
  }

  // Feed Posts
  getPosts(includeFuture = false) {
    const posts = JSON.parse(localStorage.getItem("ch_posts") || "[]");
    const reported = JSON.parse(localStorage.getItem("ch_reported_posts") || "[]");
    let filtered = posts.filter(p => !reported.includes(p.id));
    if (includeFuture) return filtered;
    const now = Date.now();
    return filtered.filter(p => {
      if (!p.publishAt) return true;
      const pubDate = new Date(p.publishAt).getTime();
      return pubDate <= now;
    });
  }

  getReportedPosts() {
    return JSON.parse(localStorage.getItem("ch_reported_posts") || "[]");
  }

  reportPost(postId) {
    let reported = this.getReportedPosts();
    if (!reported.includes(postId)) {
      reported.push(postId);
      localStorage.setItem("ch_reported_posts", JSON.stringify(reported));
    }
    window.dispatchEvent(new CustomEvent("ch_post_reported", { detail: { postId } }));
  }

  addPost(content, mediaUrl = "", mediaType = "image", isPremium = false, price = 0, poll = null, fundraiser = null, publishAt = null) {
    const posts = this.getPosts(true);
    const newPost = {
      id: "post_" + Date.now(),
      creatorUsername: localStorage.getItem("ch_user_username") || "arivera",
      creatorName: localStorage.getItem("ch_user_display_name") || "Alex Rivera",
      creatorAvatar: localStorage.getItem("ch_user_avatar") || "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
      isPinned: false,
      mediaUrl,
      mediaType,
      content,
      likes: 0,
      commentsCount: 0,
      time: publishAt ? "Scheduled" : "Just now",
      isPremium,
      price,
      poll,
      fundraiser,
      publishAt
    };
    posts.unshift(newPost);
    localStorage.setItem("ch_posts", JSON.stringify(posts));
    
    // Simulate background notifications/likes on new post after 5s
    setTimeout(() => {
      const creators = ["sarahcreates", "milaofficial", "ariamoon", "zionart"];
      const randomCreator = creators[Math.floor(Math.random() * creators.length)];
      const dbCreator = this.getCreator(randomCreator);
      const name = dbCreator ? dbCreator.name : "Sarah J.";
      const avatar = dbCreator ? dbCreator.avatar : "/assets/39bc5c3eed51d62c1022c60686bb459a.png";
      
      // Add notification
      this.addNotification("like", name, avatar, "liked your new post");
      
      // Increment stats slightly in background
      let currentSubs = parseInt(localStorage.getItem("ch_subscribers")) || 1248;
      localStorage.setItem("ch_subscribers", (currentSubs + 1).toString());
      
      let currentEarnings = parseFloat(localStorage.getItem("ch_earnings")) || 14280.50;
      localStorage.setItem("ch_earnings", (currentEarnings + 14.99).toFixed(2));
      
      // Dispatch alert
      window.dispatchEvent(new CustomEvent("ch_post_liked_bg"));
    }, 5000);

    return newPost;
  }

  // Bookmarks
  getBookmarks() {
    return JSON.parse(localStorage.getItem("ch_bookmarks") || "[]");
  }

  isBookmarked(postId) {
    return this.getBookmarks().includes(postId);
  }

  toggleBookmark(postId) {
    let bookmarks = this.getBookmarks();
    if (bookmarks.includes(postId)) {
      bookmarks = bookmarks.filter(id => id !== postId);
    } else {
      bookmarks.push(postId);
    }
    localStorage.setItem("ch_bookmarks", JSON.stringify(bookmarks));
    return bookmarks.includes(postId);
  }

  // Notifications
  getNotifications() {
    return JSON.parse(localStorage.getItem("ch_notifications") || "[]");
  }

  addNotification(type, senderName, senderAvatar, text, amount = null) {
    const notifications = this.getNotifications();
    const newNotif = {
      id: "notif_" + Date.now(),
      type,
      senderName,
      senderAvatar,
      text,
      amount,
      time: "Just now",
      read: false
    };
    notifications.unshift(newNotif);
    localStorage.setItem("ch_notifications", JSON.stringify(notifications));
    
    window.dispatchEvent(new CustomEvent("ch_notification_received"));
    return newNotif;
  }

  markNotificationsRead() {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.read = true);
    localStorage.setItem("ch_notifications", JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent("ch_notification_received"));
  }

  // Likes API
  isPostLiked(postId) {
    const liked = JSON.parse(localStorage.getItem("ch_liked_posts") || "[]");
    return liked.includes(postId);
  }

  toggleLikePost(postId) {
    let liked = JSON.parse(localStorage.getItem("ch_liked_posts") || "[]");
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    
    let isLikedNow = false;
    if (liked.includes(postId)) {
      liked = liked.filter(id => id !== postId);
      if (post) post.likes = Math.max(0, post.likes - 1);
    } else {
      liked.push(postId);
      if (post) post.likes = (post.likes || 0) + 1;
      isLikedNow = true;
    }
    
    localStorage.setItem("ch_liked_posts", JSON.stringify(liked));
    localStorage.setItem("ch_posts", JSON.stringify(posts));
    
    // Dispatch event to update other places
    window.dispatchEvent(new CustomEvent("ch_post_liked", { detail: { postId, likes: post ? post.likes : 0, isLikedNow } }));
    return { isLiked: isLikedNow, likes: post ? post.likes : 0 };
  }

  // Bookmarks API
  isBookmarked(postId) {
    const bookmarks = JSON.parse(localStorage.getItem("ch_bookmarks") || "[]");
    return bookmarks.includes(postId);
  }

  toggleBookmark(postId) {
    let bookmarks = JSON.parse(localStorage.getItem("ch_bookmarks") || "[]");
    if (bookmarks.includes(postId)) {
      bookmarks = bookmarks.filter(id => id !== postId);
    } else {
      bookmarks.push(postId);
    }
    localStorage.setItem("ch_bookmarks", JSON.stringify(bookmarks));
    window.dispatchEvent(new CustomEvent("ch_bookmark_changed", { detail: { postId } }));
    return bookmarks.includes(postId);
  }

  getBookmarkedPosts() {
    const bookmarks = JSON.parse(localStorage.getItem("ch_bookmarks") || "[]");
    const posts = this.getPosts();
    return posts.filter(p => bookmarks.includes(p.id));
  }


  // Comments API
  getComments(postId) {
    const commentsMap = JSON.parse(localStorage.getItem("ch_post_comments") || "{}");
    return commentsMap[postId] || [];
  }

  addComment(postId, text, username = "arivera") {
    const commentsMap = JSON.parse(localStorage.getItem("ch_post_comments") || "{}");
    if (!commentsMap[postId]) {
      commentsMap[postId] = [];
    }
    
    const displayName = localStorage.getItem("ch_user_display_name") || "Alex Rivera";
    const avatar = localStorage.getItem("ch_user_avatar") || "/assets/5dc72593d711173af1fe7ab74be0fa56.png";

    const newComment = {
      id: "c_" + Date.now(),
      username: localStorage.getItem("ch_user_username") || username,
      name: displayName,
      avatar: avatar,
      text: text,
      time: "Just now"
    };
    
    commentsMap[postId].push(newComment);
    localStorage.setItem("ch_post_comments", JSON.stringify(commentsMap));
    
    // Update comments count in posts list
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      localStorage.setItem("ch_posts", JSON.stringify(posts));
    }
    
    // Dispatch event to update the post card comment UI
    window.dispatchEvent(new CustomEvent("ch_comment_added", { detail: { postId, comment: newComment, count: post ? post.commentsCount : 0 } }));
    return newComment;
  }

  // Stories API
  getStories() {
    return JSON.parse(localStorage.getItem("ch_stories") || "[]");
  }

  markStoryRead(username) {
    const stories = this.getStories();
    const story = stories.find(s => s.username === username);
    if (story && story.isUnread) {
      story.isUnread = false;
      localStorage.setItem("ch_stories", JSON.stringify(stories));
      window.dispatchEvent(new CustomEvent("ch_stories_updated"));
    }
  }

  addStory(username, name, avatar, storyUrl, location = "") {
    const stories = this.getStories();
    let story = stories.find(s => s.username === username);
    const newSlide = {
      id: "slide_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      storyUrl: storyUrl,
      time: "Just now",
      location: location
    };
    
    if (story) {
      if (!story.items) story.items = [];
      story.items.push(newSlide);
      story.isUnread = true;
    } else {
      story = {
        username: username,
        name: name,
        avatar: avatar || "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
        isUnread: true,
        items: [newSlide]
      };
      stories.unshift(story);
    }
    localStorage.setItem("ch_stories", JSON.stringify(stories));
    window.dispatchEvent(new CustomEvent("ch_stories_updated"));
    return story;
  }

  // --- Creator Vault API ---
  getVaultItems() {
    return JSON.parse(localStorage.getItem("ch_vault") || "[]");
  }

  addVaultItem(fileName, fileUrl, mediaType) {
    const vault = this.getVaultItems();
    const sizeMock = (Math.random() * 5 + 1).toFixed(1) + " MB";
    const dateMock = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const item = {
      id: "v_" + Date.now(),
      name: fileName,
      url: fileUrl,
      type: mediaType,
      date: dateMock,
      size: sizeMock,
      usageCount: 0
    };
    vault.unshift(item);
    localStorage.setItem("ch_vault", JSON.stringify(vault));
    window.dispatchEvent(new CustomEvent("ch_vault_updated"));
    return item;
  }

  // --- Interactive Polls API ---
  votePoll(postId, optionIndex) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post && post.poll) {
      if (post.poll.votedOptionIndex === null || post.poll.votedOptionIndex === undefined) {
        post.poll.options[optionIndex].votes += 1;
        post.poll.votedOptionIndex = optionIndex;
        localStorage.setItem("ch_posts", JSON.stringify(posts));
        window.dispatchEvent(new CustomEvent("ch_posts_updated", { detail: { postId } }));
      }
    }
  }

  // --- Fundraiser API ---
  contributeFundraiser(postId, amount) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post && post.fundraiser) {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) return;
      
      // Deduct from wallet
      this.adjustWalletBalance(-amt, `Contribution to @${post.creatorUsername}'s fundraiser`, post.creatorUsername);
      
      // Add to post fundraiser progress
      post.fundraiser.current = parseFloat((post.fundraiser.current + amt).toFixed(2));
      localStorage.setItem("ch_posts", JSON.stringify(posts));
      window.dispatchEvent(new CustomEvent("ch_posts_updated", { detail: { postId } }));
    }
  }

  // --- Mass DMs / Broadcast Messaging API ---
  broadcastMessage(text, mediaUrl, mediaType, isPPV, price, targetList) {
    const chats = JSON.parse(localStorage.getItem("ch_chats") || "{}");
    const creators = Object.keys(DEFAULT_CREATORS);
    
    // Choose who receives it based on targetList
    let targets = [];
    if (targetList === "subscribers") {
      targets = this.getSubscriptions();
    } else if (targetList === "favorites") {
      targets = this.getFavoriteCreators();
    }
    
    // Fallback if list is empty or if targetList is "all"
    if (targets.length === 0 || targetList === "all") {
      targets = creators;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = "msg_broadcast_" + Date.now();

    targets.forEach(creatorUsername => {
      if (!chats[creatorUsername]) {
        chats[creatorUsername] = [];
      }
      chats[creatorUsername].push({
        id: msgId,
        sender: "user",
        text: text,
        time: time,
        isPPV: isPPV,
        price: parseFloat(price) || 0,
        mediaUrl: mediaUrl,
        mediaType: mediaType
      });
    });

    localStorage.setItem("ch_chats", JSON.stringify(chats));
    
    window.dispatchEvent(new CustomEvent("ch_message_sent"));
    window.dispatchEvent(new CustomEvent("ch_message_received"));
    return msgId;
  }

  // User Profile API
  getUserProfile() {
    return {
      displayName: localStorage.getItem("ch_user_display_name") || "Alex Rivera",
      username: localStorage.getItem("ch_user_username") || "arivera",
      bio: localStorage.getItem("ch_user_bio") || "A creative professional.",
      avatar: localStorage.getItem("ch_user_avatar") || "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
      role: localStorage.getItem("ch_user_role") || "fan",
      coverPhoto: localStorage.getItem("ch_user_cover") || "/assets/082f4723389abb44b68b64dfc082268b.png",
      location: localStorage.getItem("ch_user_location") || "",
      website: localStorage.getItem("ch_user_website") || "",
      joinedDate: localStorage.getItem("ch_user_joined") || "Joined 2026",
    };
  }

  setUserProfile(data, username, avatar, role) {
    if (typeof data === "string") {
      data = { displayName: data, username, avatar, role };
    }
    if (data.displayName !== undefined) localStorage.setItem("ch_user_display_name", data.displayName);
    if (data.username !== undefined) localStorage.setItem("ch_user_username", data.username);
    if (data.bio !== undefined) localStorage.setItem("ch_user_bio", data.bio);
    if (data.avatar !== undefined) localStorage.setItem("ch_user_avatar", data.avatar);
    if (data.role !== undefined) localStorage.setItem("ch_user_role", data.role);
    if (data.coverPhoto !== undefined) localStorage.setItem("ch_user_cover", data.coverPhoto);
    if (data.location !== undefined) localStorage.setItem("ch_user_location", data.location);
    if (data.website !== undefined) localStorage.setItem("ch_user_website", data.website);
    if (data.joinedDate !== undefined) localStorage.setItem("ch_user_joined", data.joinedDate);
    window.dispatchEvent(new CustomEvent("ch_profile_updated"));
  }

  getPostsByUser(username) {
    const posts = this.getPosts();
    return posts.filter(p => p.creatorUsername === username);
  }
}

// Attach to window so it is accessible on all scripts
window.mockDb = new MockDatabase();
console.log("Mock database initialized.");

// Global Payment Modal Helper
window.showPaymentModal = function(title, price, onConfirm) {
  // Check if modal already exists
  if (document.getElementById("ch-payment-modal")) return;

  const currentWalletBalance = window.mockDb.getWalletBalance();
  const isSufficientFunds = currentWalletBalance >= parseFloat(price);

  let paymentDetailsHtml = "";
  if (isSufficientFunds) {
    paymentDetailsHtml = `
      <div class="bg-surface-container p-md rounded-xl flex justify-between items-center mb-md border border-outline-variant">
        <div>
          <p class="font-label-lg text-label-lg text-on-surface">Available Wallet Balance</p>
          <p class="font-body-md text-body-md text-on-surface-variant font-medium text-green-600">Sufficient funds available</p>
        </div>
        <p class="font-headline-md text-headline-md text-green-600">$${currentWalletBalance.toFixed(2)}</p>
      </div>
      <p class="text-[12px] text-on-surface-variant mb-md leading-relaxed ml-sm">The amount of <strong>$${parseFloat(price).toFixed(2)}</strong> will be deducted directly from your account balance.</p>
    `;
  } else {
    paymentDetailsHtml = `
      <div class="bg-red-500/10 border border-red-500/20 p-md rounded-xl flex gap-md mb-md items-start">
        <span class="material-symbols-outlined text-red-500 text-[20px]">warning</span>
        <div>
          <p class="font-bold text-[12px] text-red-500 leading-none mb-1">Insufficient Balance</p>
          <p class="text-[11px] text-on-surface-variant leading-relaxed">Your balance is $${currentWalletBalance.toFixed(2)}. Please complete payment using your card details below to cover the checkout fee.</p>
        </div>
      </div>
      <div class="bg-surface-container p-md rounded-xl flex justify-between items-center mb-md">
        <div>
          <p class="font-label-lg text-label-lg text-on-surface">${title}</p>
          <p class="font-body-md text-body-md text-on-surface-variant">Secure credit card checkout</p>
        </div>
        <p class="font-headline-md text-headline-md text-primary">$${parseFloat(price).toFixed(2)}</p>
      </div>
    `;
  }

  let customTipMessageHtml = "";
  if (title.includes("Tip")) {
    customTipMessageHtml = `
      <div class="mb-md">
        <label class="block font-label-md text-on-surface-variant mb-xs ml-sm">Tip Message (Optional)</label>
        <input id="payment-tip-message" class="w-full px-md py-[10px] bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-0 outline-none text-body-md" placeholder="Write a message to show on stream..." type="text" />
      </div>
    `;
  }

  const cardInputFormHtml = `
    <form id="payment-form" class="space-y-md">
      ${customTipMessageHtml}
      ${!isSufficientFunds ? `
        <div>
          <label class="block font-label-md text-on-surface-variant mb-xs ml-sm">Cardholder Name</label>
          <input class="w-full px-md py-[10px] bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-0 outline-none text-body-md" required type="text" value="Alex Rivera" />
        </div>
        
        <div>
          <label class="block font-label-md text-on-surface-variant mb-xs ml-sm">Card Number</label>
          <input class="w-full px-md py-[10px] bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-0 outline-none text-body-md" required placeholder="4111 2222 3333 4444" max-length="19" type="text" value="4111 2222 3333 4444" />
        </div>
        
        <div class="grid grid-cols-2 gap-md">
          <div>
            <label class="block font-label-md text-on-surface-variant mb-xs ml-sm">Expiry Date</label>
            <input class="w-full px-md py-[10px] bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-0 outline-none text-body-md" required placeholder="MM/YY" type="text" value="12/28" />
          </div>
          <div>
            <label class="block font-label-md text-on-surface-variant mb-xs ml-sm">CVV</label>
            <input class="w-full px-md py-[10px] bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-0 outline-none text-body-md" required placeholder="321" type="password" value="123" />
          </div>
        </div>
      ` : ''}
      
      <button type="submit" id="pay-submit-btn" class="w-full mt-lg py-md bg-primary text-on-primary rounded-full font-headline-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-sm shadow-md cursor-pointer">
        <span class="material-symbols-outlined text-[20px]">lock</span>
        <span>${isSufficientFunds ? 'Confirm Purchase' : 'Pay Now'}</span>
      </button>
    </form>
  `;

  const modalHtml = `
    <div id="ch-payment-modal" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs transition-all duration-300 opacity-0">
      <div class="bg-surface-container-lowest border border-outline-variant w-full max-w-[420px] p-lg rounded-2xl shadow-xl transform scale-95 transition-all duration-300 mx-md">
        <div class="flex justify-between items-center mb-lg border-b border-outline-variant pb-md">
          <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Secure Checkout</h3>
          <button id="close-payment-modal" class="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="space-y-md">
          ${paymentDetailsHtml}
          ${cardInputFormHtml}
        </div>
      </div>
    </div>
  `;

  // Append modal to body
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);

  const modal = document.getElementById("ch-payment-modal");
  const modalBox = modal.querySelector("div");
  
  // Fade in animation
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    modalBox.classList.remove("scale-95");
  }, 10);

  // Close helper
  const closeModal = () => {
    modal.classList.add("opacity-0");
    modalBox.classList.add("scale-95");
    setTimeout(() => {
      modal.remove();
    }, 300);
  };

  document.getElementById("close-payment-modal").addEventListener("click", closeModal);

  // Form submission
  document.getElementById("payment-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = document.getElementById("pay-submit-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-xs"></span> Processing...`;
    
    const tipMessageInput = document.getElementById("payment-tip-message");
    const tipMessage = tipMessageInput ? tipMessageInput.value.trim() : "";
    
    // Simulate API call
    setTimeout(() => {
      btn.className = "w-full mt-lg py-md bg-green-600 text-white rounded-full font-headline-sm flex items-center justify-center gap-sm shadow-md";
      btn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Success!`;
      
      setTimeout(() => {
        closeModal();
        if (onConfirm) onConfirm(tipMessage);
      }, 1000);
    }, 1200);
  });
};

if (!window.showToast) {
  window.showToast = function(message) {
    const existing = document.querySelector(".ch-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "ch-toast fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-surface-container-high text-on-surface text-label-lg font-bold px-lg py-md rounded-full shadow-lg z-[9999] flex items-center gap-sm border border-outline-variant";
    toast.innerHTML = `<span class="material-symbols-outlined text-primary">done</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, 10px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => toast.remove(), 220);
    }, 2200);
  };
}

// Global UI Syncing Script
document.addEventListener("DOMContentLoaded", () => {
  const syncSidebarBranding = () => {
    const displayName = localStorage.getItem("ch_user_display_name") || "Alex Rivera";
    const username = localStorage.getItem("ch_user_username") || "arivera";
    const avatar = localStorage.getItem("ch_user_avatar") || "/assets/5dc72593d711173af1fe7ab74be0fa56.png";
    
    // Select all user cards in sidebars (across different layouts/pages)
    const userCards = document.querySelectorAll('nav div[onclick*="profile"], aside div[onclick*="profile"]');
    userCards.forEach(card => {
      const img = card.querySelector('img');
      if (img) img.src = avatar;
      
      const nameEl = card.querySelector('.font-label-lg, p.font-semibold');
      if (nameEl) nameEl.innerText = displayName;
      
      const usernameEl = card.querySelector('.font-label-md, p.text-on-surface-variant');
      if (usernameEl) usernameEl.innerText = "@" + username.replace("@", "");
    });

    document.querySelectorAll("#sidebar-user-name, #studio-sidebar-name").forEach(el => {
      el.innerText = displayName;
    });
    document.querySelectorAll("#sidebar-user-uname, #studio-sidebar-uname").forEach(el => {
      el.innerText = "@" + username.replace("@", "");
    });
    document.querySelectorAll("#sidebar-user-avatar, #studio-sidebar-avatar").forEach(img => {
      img.src = avatar;
      img.alt = displayName;
    });
  };

  syncSidebarBranding();

  const normalizePath = (href) => {
    try {
      return new URL(href, window.location.origin).pathname.replace(/\/$/, "") || "/";
    } catch (e) {
      return "";
    }
  };

  const syncRoleNavigation = () => {
    const role = localStorage.getItem("ch_user_role") || "fan";
    const creatorOnlyPaths = ["/create-post", "/studio", "/vault", "/live"];
    const fanOnlyPaths = ["/explore", "/collections"];
    const hiddenPaths = role === "creator" ? fanOnlyPaths : creatorOnlyPaths;
    const visiblePaths = role === "creator" ? creatorOnlyPaths : fanOnlyPaths;

    const sidebars = [...document.querySelectorAll("nav")].filter(nav => (
      nav.id === "sidebar-nav" ||
      nav.querySelector('a[href="/studio"], a[href="/create-post"]')
    ));
    sidebars.forEach(sidebar => {
      const navList = sidebar.querySelector(".flex-1") || sidebar;
      [
        { path: "/vault", label: "Vault", icon: "folder_special" },
        { path: "/live", label: "Live", icon: "live_tv" }
      ].forEach(item => {
        if (navList.querySelector(`a[href="${item.path}"]`)) return;

        const isActive = normalizePath(window.location.href) === item.path;
        const link = document.createElement("a");
        link.href = item.path;
        link.dataset.tooltip = item.label;
        link.className = isActive
          ? "sidebar-nav-link flex items-center gap-md px-md py-sm rounded-xl bg-[#00aff0]/10 text-[#00aff0] font-semibold transition-colors"
          : "sidebar-nav-link flex items-center gap-md px-md py-sm rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors";
        link.innerHTML = `
          <span class="material-symbols-outlined" ${isActive ? 'style="font-variation-settings: \'FILL\' 1;"' : ""}>${item.icon}</span>
          <span class="sidebar-label font-label-lg text-label-lg">${item.label}</span>
        `;
        navList.appendChild(link);
      });
    });

    document.querySelectorAll("a[href], button[onclick], .new-post-btn-trigger, .sidebar-new-post-btn").forEach(el => {
      const hrefPath = el.matches("a[href]") ? normalizePath(el.getAttribute("href")) : "";
      const onclick = el.getAttribute("onclick") || "";
      const isCreatorOnly = creatorOnlyPaths.some(path => hrefPath === path || onclick.includes(path)) || el.classList.contains("new-post-btn-trigger") || el.classList.contains("sidebar-new-post-btn");
      const isFanOnly = fanOnlyPaths.some(path => hrefPath === path || onclick.includes(path));
      const shouldHide = (hiddenPaths.includes(hrefPath) || (role !== "creator" && isCreatorOnly) || (role === "creator" && isFanOnly));
      const shouldShow = visiblePaths.includes(hrefPath) || (role === "creator" && isCreatorOnly) || (role !== "creator" && isFanOnly);

      if (shouldHide) {
        el.dataset.roleHidden = "true";
        el.style.display = "none";
      } else if (el.dataset.roleHidden === "true" && shouldShow) {
        el.style.display = "";
        delete el.dataset.roleHidden;
      }
    });

    if (role !== "creator" && creatorOnlyPaths.includes(normalizePath(window.location.href))) {
      window.location.href = "/";
    }
  };

  syncRoleNavigation();

  const ensureOnboarding = () => {
    const publicPaths = ["/login", "/sign-up", "/sign-in", "/onboarding"];
    const path = normalizePath(window.location.href);
    if (!publicPaths.includes(path) && localStorage.getItem("ch_onboarding_done") !== "true") {
      window.location.href = "/onboarding";
    }
  };

  ensureOnboarding();

  const syncNotificationBadges = () => {
    const notifications = window.mockDb.getNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const notifLinks = document.querySelectorAll('a[href="/notifications"]');
    notifLinks.forEach(link => {
      const existingBadge = link.querySelector('.notif-badge');
      if (existingBadge) existingBadge.remove();
      
      if (unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.setAttribute('aria-label', unreadCount + ' unread notifications');
        // Just a dot — no number
        link.appendChild(badge);
      }
    });
  };

  syncNotificationBadges();

  // Listen to profile updates
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("ch_user_")) {
      syncSidebarBranding();
      syncRoleNavigation();
    }
    if (e.key === "ch_notifications") {
      syncNotificationBadges();
    }
  });

  window.addEventListener("ch_notification_received", syncNotificationBadges);
  window.addEventListener("ch_post_liked_bg", syncNotificationBadges);
  window.addEventListener("ch_profile_updated", () => {
    syncSidebarBranding();
    syncRoleNavigation();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (!path.startsWith("/settings")) return;

  const qs = (selector) => document.querySelector(selector);
  const qsa = (selector) => [...document.querySelectorAll(selector)];
  const cleanUsername = (value) => (value || "").replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const setToggle = (el, active) => {
    if (!el) return;
    el.classList.toggle("active", !!active);
    el.setAttribute("role", "switch");
    el.setAttribute("aria-checked", active ? "true" : "false");
  };

  const bindToggle = (el, key, fallback = false, label = "Setting") => {
    if (!el || el.dataset.settingsBound === "true") return;
    el.dataset.settingsBound = "true";
    setToggle(el, localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) === "true");
    el.addEventListener("click", () => {
      const active = !el.classList.contains("active");
      localStorage.setItem(key, active ? "true" : "false");
      setToggle(el, active);
      window.showToast(`${label} ${active ? "enabled" : "disabled"}`);
    });
  };

  const setSecondLineFor = (onclickPart, value) => {
    const row = qsa(`[onclick*="${onclickPart}"]`).find(Boolean);
    if (!row) return;
    const lines = row.querySelectorAll("p");
    if (lines[1]) lines[1].textContent = value;
  };

  const hydrateSettingsHome = () => {
    if (path !== "/settings") return;

    const email = localStorage.getItem("ch_user_email") || "alex.rivera@creatorhub.com";
    setSecondLineFor("/settings/email", email);

    bindToggle(qs("#push-notifications-toggle"), "ch_pref_push_notifications", true, "Push notifications");
    bindToggle(qs("#email-notifications-toggle"), "ch_pref_email_notifications", false, "Email notifications");
    bindToggle(qs("#private-profile-toggle"), "ch_pref_private_profile", false, "Private profile");

    qsa("button").forEach(button => {
      if ((button.textContent || "").trim() !== "Log Out" || button.dataset.settingsBound === "true") return;
      button.dataset.settingsBound = "true";
      button.addEventListener("click", () => {
        localStorage.setItem("ch_logged_out", "true");
        window.showToast("Logged out");
        setTimeout(() => { window.location.href = "/login"; }, 500);
      });
    });
  };

  const hydrateEditProfile = () => {
    if (path !== "/settings/edit-profile") return;

    const profile = window.mockDb.getUserProfile();
    const nameInput = qs("#display-name-input");
    const usernameInput = qs("#username-input");
    const bioInput = qs("#bio-input");
    const avatarPreview = qs("#avatar-preview");
    const coverPreview = qs("#banner-preview");

    if (nameInput) nameInput.value = profile.displayName;
    if (usernameInput) usernameInput.value = cleanUsername(profile.username);
    if (bioInput) bioInput.value = profile.bio;
    if (avatarPreview) avatarPreview.src = profile.avatar;
    if (coverPreview) coverPreview.src = profile.coverPhoto;

    let selectedAvatar = profile.avatar;
    let selectedCover = profile.coverPhoto;
    const avatarChoices = [
      "/assets/5dc72593d711173af1fe7ab74be0fa56.png",
      "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
      "/assets/0c0bf4c58678d852ea7588ef1045309e.png"
    ];
    const coverChoices = [
      "/assets/082f4723389abb44b68b64dfc082268b.png",
      "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
      "/assets/efcfd91838f89a7a1dcef9eac6ec0b56.png"
    ];

    const cycleChoice = (choices, current) => choices[(Math.max(0, choices.indexOf(current)) + 1) % choices.length];
    const photoButton = qsa("button").find(btn => (btn.textContent || "").includes("Change Photo"));
    if (photoButton && photoButton.dataset.settingsBound !== "true") {
      photoButton.dataset.settingsBound = "true";
      photoButton.addEventListener("click", () => {
        selectedAvatar = cycleChoice(avatarChoices, selectedAvatar);
        if (avatarPreview) avatarPreview.src = selectedAvatar;
      });
    }
    const bannerBox = coverPreview ? coverPreview.closest(".relative") : null;
    if (bannerBox && bannerBox.dataset.settingsBound !== "true") {
      bannerBox.dataset.settingsBound = "true";
      bannerBox.addEventListener("click", () => {
        selectedCover = cycleChoice(coverChoices, selectedCover);
        if (coverPreview) coverPreview.src = selectedCover;
      });
    }

    const form = qs("#edit-profile-form");
    if (form && form.dataset.settingsBound !== "true") {
      form.dataset.settingsBound = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const displayName = (nameInput?.value || "").trim();
        const username = cleanUsername(usernameInput?.value || "");
        const bio = (bioInput?.value || "").trim();

        if (displayName.length < 2) {
          window.showToast("Display name must be at least 2 characters");
          return;
        }
        if (!/^[a-z0-9_]{3,30}$/.test(username)) {
          window.showToast("Username must be 3-30 letters, numbers, or underscores");
          return;
        }

        window.mockDb.setUserProfile({
          displayName,
          username,
          bio,
          avatar: selectedAvatar,
          coverPhoto: selectedCover
        });
        localStorage.setItem("ch_onboarding_done", "true");
        window.showToast("Profile saved");
        setTimeout(() => { window.location.href = "/settings"; }, 600);
      });
    }
  };

  const hydrateEmail = () => {
    if (path !== "/settings/email") return;
    const input = qs("#email-input");
    if (input) input.value = localStorage.getItem("ch_user_email") || "alex.rivera@creatorhub.com";
    const form = qs("#email-form");
    if (form && form.dataset.settingsBound !== "true") {
      form.dataset.settingsBound = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const email = (input?.value || "").trim().toLowerCase();
        if (!isValidEmail(email)) {
          window.showToast("Enter a valid email address");
          return;
        }
        localStorage.setItem("ch_user_email", email);
        localStorage.setItem("ch_user_email_verified", "false");
        window.showToast("Email updated. Verification pending");
        setTimeout(() => { window.location.href = "/settings"; }, 600);
      });
    }
  };

  const hydrateSecurity = () => {
    if (path !== "/settings/security") return;
    setToggle(qs("#2fa-toggle"), localStorage.getItem("ch_security_2fa") === "true");
    setToggle(qs("#biometric-toggle"), localStorage.getItem("ch_security_biometric") === null ? true : localStorage.getItem("ch_security_biometric") === "true");

    const form = qs("#password-form");
    if (form && form.dataset.settingsBound !== "true") {
      form.dataset.settingsBound = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const current = qs("#current-pass")?.value || "";
        const next = qs("#new-pass")?.value || "";
        const confirm = qs("#confirm-pass")?.value || "";
        const stored = localStorage.getItem("ch_user_password");

        if (stored && current !== stored) {
          window.showToast("Current password is incorrect");
          return;
        }
        if (next.length < 8) {
          window.showToast("New password must be at least 8 characters");
          return;
        }
        if (next !== confirm) {
          window.showToast("New passwords do not match");
          return;
        }

        localStorage.setItem("ch_user_password", next);
        localStorage.setItem("ch_password_updated_at", new Date().toISOString());
        ["#current-pass", "#new-pass", "#confirm-pass"].forEach(id => {
          const input = qs(id);
          if (input) input.value = "";
        });
        window.showToast("Password updated");
      });
    }
  };

  const hydrateBlockedUsers = () => {
    if (path !== "/settings/blocked-users") return;
    const input = qs("#block-search-input");
    const button = qs("#block-btn");
    if (button && input && button.dataset.settingsBound !== "true") {
      button.dataset.settingsBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const username = cleanUsername(input.value);
        const ownUsername = cleanUsername(localStorage.getItem("ch_user_username") || "arivera");
        if (!/^[a-z0-9_]{3,30}$/.test(username)) {
          event.stopImmediatePropagation();
          window.showToast("Enter a valid username to block");
          return;
        }
        if (username === ownUsername) {
          event.stopImmediatePropagation();
          window.showToast("You cannot block your own account");
          return;
        }
        if (window.mockDb.isBlocked(username)) {
          event.stopImmediatePropagation();
          window.showToast(`@${username} is already blocked`);
          return;
        }
      }, true);
    }
  };

  const hydrateMonetization = () => {
    if (path !== "/settings/monetization") return;
    const priceInput = qs("#base-sub-price");
    if (priceInput) {
      priceInput.value = parseFloat(localStorage.getItem("ch_base_sub_price") || "9.99").toFixed(2);
      priceInput.addEventListener("change", () => {
        const price = Math.min(99.99, Math.max(4.99, parseFloat(priceInput.value) || 9.99));
        priceInput.value = price.toFixed(2);
      });
    }
    const saveButton = qs("#save-monetization-settings-btn");
    if (saveButton && saveButton.dataset.settingsBound !== "true") {
      saveButton.dataset.settingsBound = "true";
      saveButton.addEventListener("click", () => {
        const price = Math.min(99.99, Math.max(4.99, parseFloat(priceInput?.value || "9.99") || 9.99));
        localStorage.setItem("ch_base_sub_price", price.toFixed(2));
      }, true);
    }
  };

  const hydrateDeleteAccount = () => {
    if (path !== "/settings/delete-account") return;
    const form = qs("#delete-form");
    if (form && form.dataset.settingsBound !== "true") {
      form.dataset.settingsBound = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const password = qs("#delete-pass")?.value || "";
        const confirmed = qs("#delete-confirm-check")?.checked;
        const stored = localStorage.getItem("ch_user_password");
        if (!confirmed) {
          window.showToast("Confirm deletion first");
          return;
        }
        if (stored && password !== stored) {
          window.showToast("Password is incorrect");
          return;
        }

        const preservedTheme = localStorage.getItem("ch_theme");
        const preservedSidebar = localStorage.getItem("ch_sidebar_collapsed");
        Object.keys(localStorage).filter(key => key.startsWith("ch_")).forEach(key => localStorage.removeItem(key));
        if (preservedTheme) localStorage.setItem("ch_theme", preservedTheme);
        if (preservedSidebar) localStorage.setItem("ch_sidebar_collapsed", preservedSidebar);
        localStorage.setItem("ch_account_deleted", "true");
        window.showToast("Account deleted locally");
        setTimeout(() => { window.location.href = "/sign-up"; }, 800);
      });
    }
  };

  hydrateSettingsHome();
  hydrateEditProfile();
  hydrateEmail();
  hydrateSecurity();
  hydrateBlockedUsers();
  hydrateMonetization();
  hydrateDeleteAccount();
});
