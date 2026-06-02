// Next.js-Safe Production-Grade Client-Side Mock Database
// Persists state in localStorage to sync data across all components and pages

export interface Creator {
  name: string;
  username: string;
  avatar: string;
  cover: string;
  bio: string;
  location: string;
  website: string;
  likes: string;
  subPrice: number;
  verified: boolean;
  tag: string;
  fansCount: string;
  postsCount?: string;
  photosCount?: string;
  videosCount?: string;
  joinedDate?: string;
  discountActive?: boolean;
  discountPercent?: number;
  callsEnabled?: boolean;
  callPricePerMin?: number;
}

export interface Post {
  id: string;
  creatorUsername: string;
  creatorName: string;
  creatorAvatar: string;
  isPinned: boolean;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video' | string;
  content: string;
  likes: number;
  commentsCount: number;
  time: string;
  isPremium: boolean;
  price: number;
  poll?: {
    question: string;
    options: { text: string; votes: number }[];
    votedOptionIndex?: number | null;
  } | null;
  fundraiser?: {
    title: string;
    goal: number;
    current: number;
  } | null;
  publishAt?: string | null;
  repostedFromId?: string | null;
  repostedBy?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: string; // 'user' or creatorUsername
  text: string;
  time: string;
  isPPV?: boolean;
  price?: number;
  mediaUrl?: string;
  mediaType?: string;
  audioDuration?: string;
}

export interface Transaction {
  id: string;
  type: 'tip' | 'withdrawal' | 'subscription' | 'funds' | 'unlock' | 'fundraiser';
  title: string;
  subtitle: string;
  amount: number;
}

export interface CreatorLedgerEntry {
  id: string;
  creatorUsername: string;
  type: 'tip' | 'subscription' | 'unlock' | 'fundraiser';
  title: string;
  amount: number;
  postId?: string;
  fanUsername: string;
  createdAt: string;
}

export interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  avatar: string;
  role: 'creator' | 'fan';
  coverPhoto: string;
  location: string;
  website: string;
  joinedDate: string;
  email?: string;
  kycVerified?: boolean;
  kycUploaded?: boolean;
  kycName?: string;
  kycDocumentType?: string;
  twoFactor?: boolean;
  biometric?: boolean;
  discountActive?: boolean;
  discountPercent?: number;
  callsEnabled?: boolean;
  callRate?: number;
  subPrice?: number;
}

export interface StorySlide {
  id: string;
  storyUrl: string;
  time: string;
  location?: string;
}

export interface Story {
  username: string;
  name: string;
  avatar: string;
  isUnread: boolean;
  items: StorySlide[];
}

export interface Notification {
  id: string;
  type: 'subscribe' | 'tip' | 'like' | 'comment';
  senderName: string;
  senderAvatar: string;
  text: string;
  amount?: number | null;
  time: string;
  read?: boolean;
}

export interface PostComment {
  id: string;
  username: string;
  name: string;
  avatar: string;
  text: string;
  time: string;
}

export interface VaultItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | string;
  date: string;
  size: string;
  usageCount: number;
}

export interface LinkedCard {
  id: string;
  holder: string;
  number: string;
  expiry: string;
  isDefault: boolean;
}

export interface CustomList {
  id: string;
  name: string;
  usernames: string[];
}

export interface SubDetails {
  username: string;
  name: string;
  avatar: string;
  price: number;
  expiryDate: string;
  autoRenew: boolean;
  status: 'active' | 'expired';
}

const DEFAULT_CREATORS: Record<string, Creator> = {
  lanarhoades: {
    name: "Lana Rhoades",
    username: "lanarhoades",
    avatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    cover: "/assets/082f4723389abb44b68b64dfc082268b.png",
    bio: "Thank you for supporting me! 💕\nExclusive content every day.",
    location: "Los Angeles, CA",
    website: "lanarhoades.fans",
    likes: "7.8K",
    subPrice: 14.99,
    verified: true,
    tag: "Lifestyle",
    fansCount: "1.1K",
    postsCount: "1.2K",
    photosCount: "228",
    videosCount: "356",
    joinedDate: "Sep 2020"
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

const DEFAULT_POSTS: Post[] = [
  {
    id: "post_lana_1",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/082f4723389abb44b68b64dfc082268b.png",
    mediaType: "image",
    content: "Thank you for supporting me! 💕 Exclusive content every day.",
    likes: 1800,
    commentsCount: 156,
    time: "2h ago",
    isPremium: true,
    price: 9.99
  },
  {
    id: "post_lana_2",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/1b01065d7e887ce3d8b379aabd6221a2.png",
    mediaType: "image",
    content: "Exclusive photoset! ❤️",
    likes: 1400,
    commentsCount: 92,
    time: "4h ago",
    isPremium: false,
    price: 0
  },
  {
    id: "post_lana_3",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/26ad03d14c762b66bec524c5aeb135d6.png",
    mediaType: "image",
    content: "Unlock this exclusive post! 🔥",
    likes: 2100,
    commentsCount: 198,
    time: "1d ago",
    isPremium: true,
    price: 12.99
  },
  {
    id: "post_lana_4",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/33835d122eba2ad097de797e914a7b1b.png",
    mediaType: "image",
    content: "On the bed today, lazy vibes 💕",
    likes: 950,
    commentsCount: 45,
    time: "2d ago",
    isPremium: false,
    price: 0
  },
  {
    id: "post_lana_5",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
    mediaType: "image",
    content: "Standing tall. Do you like this outfit? 😘",
    likes: 3100,
    commentsCount: 220,
    time: "3d ago",
    isPremium: false,
    price: 0
  },
  {
    id: "post_lana_6",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/3a8c80ddb65a96799f1bed3d270ba06d.png",
    mediaType: "image",
    content: "Behind the scenes set! ✨",
    likes: 1200,
    commentsCount: 88,
    time: "4d ago",
    isPremium: true,
    price: 7.99
  },
  {
    id: "post_lana_7",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/be708ecefc41b969ee64c477f954168c.png",
    mediaType: "image",
    content: "Pink vibes today! Do you love it? 💕🌸",
    likes: 1800,
    commentsCount: 130,
    time: "5d ago",
    isPremium: false,
    price: 0
  },
  {
    id: "post_lana_8",
    creatorUsername: "lanarhoades",
    creatorName: "Lana Rhoades",
    creatorAvatar: "/assets/00dcbdc82244f0ba0d9f0e475c7e7780.png",
    isPinned: false,
    mediaUrl: "/assets/3bb70096eea316455e8aef5ee2e178a7.png",
    mediaType: "image",
    content: "Unlock my private set! 🍑",
    likes: 2700,
    commentsCount: 194,
    time: "6d ago",
    isPremium: true,
    price: 10.99
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

const DEFAULT_CHATS: Record<string, ChatMessage[]> = {
  lanarhoades: [
    { id: "msg_1", sender: "lanarhoades", text: "Hey! Thanks for stopping by. Check my page out, new photo sets dropping regularly! 😘", time: "11:02 AM" }
  ],
  demirose: [
    { id: "msg_s1", sender: "demirose", text: "Hey Alex! Thanks for subscribing. Let's chat and share beautiful vibes! ☀️❤️", time: "Yesterday" }
  ]
};

class MockDatabase {
  constructor() {
    this.init();
  }

  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private getItem(key: string, fallback: string): string {
    if (!this.isClient()) return fallback;
    return localStorage.getItem(key) || fallback;
  }

  private setItem(key: string, value: string): void {
    if (!this.isClient()) return;
    localStorage.setItem(key, value);
  }

  init() {
    if (!this.isClient()) return;
    
    const CURRENT_DB_VERSION = "creatorhub_v6_ready_demo";
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
      localStorage.removeItem("ch_user_display_name");
      localStorage.removeItem("ch_user_username");
      localStorage.removeItem("ch_user_avatar");
      localStorage.removeItem("ch_user_role");
      localStorage.removeItem("ch_onboarding_done");
      localStorage.removeItem("ch_logged_out");
      localStorage.setItem("ch_db_version", CURRENT_DB_VERSION);
    }

    if (!localStorage.getItem("ch_subscriptions") || JSON.parse(localStorage.getItem("ch_subscriptions") || "[]").length === 0) {
      localStorage.setItem("ch_subscriptions", JSON.stringify(["nicolethorne", "lanarhoades"])); 
    }
    if (!localStorage.getItem("ch_posts") || JSON.parse(localStorage.getItem("ch_posts") || "[]").length === 0) {
      localStorage.setItem("ch_posts", JSON.stringify(DEFAULT_POSTS));
    }
    if (!localStorage.getItem("ch_chats")) {
      localStorage.setItem("ch_chats", JSON.stringify(DEFAULT_CHATS));
    }
    if (!localStorage.getItem("ch_unlocked")) {
      localStorage.setItem("ch_unlocked", JSON.stringify([])); 
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

    if (!localStorage.getItem("ch_creator_ledger")) {
      localStorage.setItem("ch_creator_ledger", JSON.stringify([]));
    }

    if (!localStorage.getItem("ch_linked_cards")) {
      const DEFAULT_CARDS = [
        { id: "card_1", holder: "Alex Rivera", number: "4111 2222 3333 4444", expiry: "12/29", isDefault: true }
      ];
      localStorage.setItem("ch_linked_cards", JSON.stringify(DEFAULT_CARDS));
    }

    if (!localStorage.getItem("ch_custom_lists")) {
      const DEFAULT_LISTS = [
        { id: "list_1", name: "VIP Tippers", usernames: ["demirose", "lanarhoades"] },
        { id: "list_2", name: "Close Friends", usernames: ["amouranth"] }
      ];
      localStorage.setItem("ch_custom_lists", JSON.stringify(DEFAULT_LISTS));
    }

    if (!localStorage.getItem("ch_sub_renew_settings")) {
      const DEFAULT_RENEW = {
        "lanarhoades": true,
        "nicolethorne": false
      };
      localStorage.setItem("ch_sub_renew_settings", JSON.stringify(DEFAULT_RENEW));
    }
    
    // User credentials (Anshh - 100% Screenshot parity)
    if (!localStorage.getItem("ch_user_display_name")) {
      localStorage.setItem("ch_user_display_name", "Anshh");
    }
    if (!localStorage.getItem("ch_user_username")) {
      localStorage.setItem("ch_user_username", "anshh");
    }
    if (!localStorage.getItem("ch_user_bio")) {
      localStorage.setItem("ch_user_bio", "OnlyFans Premium Indian Creator platform.");
    }
    if (!localStorage.getItem("ch_user_avatar")) {
      localStorage.setItem("ch_user_avatar", "/assets/082f4723389abb44b68b64dfc082268b.png");
    }
    if (!localStorage.getItem("ch_user_role")) {
      localStorage.setItem("ch_user_role", "creator");
    }
    if (!localStorage.getItem("ch_onboarding_done")) {
      localStorage.setItem("ch_onboarding_done", "true");
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

    if (!localStorage.getItem("ch_stories") || JSON.parse(localStorage.getItem("ch_stories") || "[]").length === 0) {
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

  // Helper dispatcher to communicate local state changes across client hooks
  private notify(eventName: string, detail?: Record<string, unknown>) {
    if (!this.isClient()) return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  // Blocked Users API
  getBlockedUsers(): string[] {
    return JSON.parse(this.getItem("ch_blocked_users", "[]"));
  }

  isBlocked(username: string): boolean {
    if (!username) return false;
    const clean = username.replace("@", "");
    return this.getBlockedUsers().includes(clean);
  }

  toggleBlockUser(username: string): boolean {
    if (!username) return false;
    const clean = username.replace("@", "");
    let blocked = this.getBlockedUsers();
    if (blocked.includes(clean)) {
      blocked = blocked.filter(u => u !== clean);
    } else {
      blocked.push(clean);
      this.unsubscribe(clean);
    }
    this.setItem("ch_blocked_users", JSON.stringify(blocked));
    this.notify("ch_blocked_users_updated", { username: clean });
    return blocked.includes(clean);
  }

  // Favorite Creators API
  getFavoriteCreators(): string[] {
    return JSON.parse(this.getItem("ch_favorite_creators", "[]"));
  }

  isFavoriteCreator(username: string): boolean {
    if (!username) return false;
    const clean = username.replace("@", "");
    return this.getFavoriteCreators().includes(clean);
  }

  toggleFavoriteCreator(username: string): boolean {
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
    this.setItem("ch_favorite_creators", JSON.stringify(favorites));
    this.notify("ch_favorite_creators_updated", { username: clean, isFavorite: isFav });
    return isFav;
  }

  // Creators Listing API
  getCreators(): Record<string, Creator> {
    const list: Record<string, Creator> = {};
    Object.keys(DEFAULT_CREATORS).forEach(username => {
      const creatorObj = this.getCreator(username);
      if (creatorObj) {
        list[username] = creatorObj;
      }
    });
    return list;
  }

  getCreator(username: string): Creator | null {
    const clean = username.replace("@", "");
    const base = DEFAULT_CREATORS[clean] || null;
    if (!base) return null;
    
    if (this.isClient()) {
      const savedPrice = localStorage.getItem(`ch_price_${clean}`);
      const discountActive = localStorage.getItem(`ch_discount_active_${clean}`) === "true";
      const discountPercent = parseInt(localStorage.getItem(`ch_discount_percent_${clean}`) || "0");
      const callsEnabled = localStorage.getItem(`ch_calls_enabled_${clean}`) !== "false";
      const callPricePerMin = parseFloat(localStorage.getItem(`ch_call_rate_${clean}`) || "5.00");
      
      return {
        ...base,
        subPrice: savedPrice ? parseFloat(savedPrice) : base.subPrice,
        discountActive,
        discountPercent: discountPercent || undefined,
        callsEnabled,
        callPricePerMin
      };
    }
    return {
      ...base,
      callsEnabled: true,
      callPricePerMin: 5.00
    };
  }

  setCreatorDiscount(username: string, percent: number, active: boolean) {
    const clean = username.replace("@", "");
    this.setItem(`ch_discount_active_${clean}`, active ? "true" : "false");
    this.setItem(`ch_discount_percent_${clean}`, percent.toString());
    this.notify("ch_profile_updated");
  }

  setCreatorCallRate(username: string, enabled: boolean, rate: number) {
    const clean = username.replace("@", "");
    this.setItem(`ch_calls_enabled_${clean}`, enabled ? "true" : "false");
    this.setItem(`ch_call_rate_${clean}`, rate.toString());
    this.notify("ch_profile_updated");
  }

  // Subscriptions
  getSubscriptions(): string[] {
    return JSON.parse(this.getItem("ch_subscriptions", "[]"));
  }

  isSubscribed(creatorUsername: string): boolean {
    const username = creatorUsername.replace("@", "");
    return this.getSubscriptions().includes(username);
  }

  unsubscribe(creatorUsername: string) {
    const username = creatorUsername.replace("@", "");
    let subs = this.getSubscriptions();
    if (subs.includes(username)) {
      subs = subs.filter(u => u !== username);
      this.setItem("ch_subscriptions", JSON.stringify(subs));
      
      const currentSubs = parseInt(this.getItem("ch_subscribers", "1248")) || 1248;
      this.setItem("ch_subscribers", Math.max(0, currentSubs - 1).toString());
      this.notify("ch_subscriptions_updated");
    }
  }

  subscribe(creatorUsername: string, price: number = 0) {
    const username = creatorUsername.replace("@", "");
    const subs = this.getSubscriptions();
    if (!subs.includes(username)) {
      if (this.isBlocked(username)) return;

      subs.push(username);
      this.setItem("ch_subscriptions", JSON.stringify(subs));
      
      if (price > 0) {
        this.adjustWalletBalance(-price, `Subscription to @${username}`, username);
      }
      
      const currentSubs = parseInt(this.getItem("ch_subscribers", "1248")) || 1248;
      this.setItem("ch_subscribers", (currentSubs + 1).toString());
      this.notify("ch_subscriptions_updated");
    }
  }

  // Wallet and Balance API
  getWalletBalance(): number {
    return parseFloat(this.getItem("ch_wallet_balance", "450.00"));
  }

  getTransactions(): Transaction[] {
    return JSON.parse(this.getItem("ch_transactions", "[]"));
  }

  getCreatorLedger(): CreatorLedgerEntry[] {
    return JSON.parse(this.getItem("ch_creator_ledger", "[]"));
  }

  recordCreatorLedger(
    creatorUsername: string,
    type: CreatorLedgerEntry["type"],
    amount: number,
    title: string,
    postId?: string
  ) {
    const cleanUsername = creatorUsername.replace("@", "");
    if (!cleanUsername || amount <= 0) return;

    const ledger = this.getCreatorLedger();
    ledger.unshift({
      id: "ledger_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      creatorUsername: cleanUsername,
      type,
      title,
      amount: parseFloat(amount.toFixed(2)),
      postId,
      fanUsername: this.getItem("ch_user_username", "arivera"),
      createdAt: new Date().toISOString(),
    });
    this.setItem("ch_creator_ledger", JSON.stringify(ledger));

    const currentEarnings = parseFloat(this.getItem("ch_earnings", "14280.50")) || 14280.50;
    this.setItem("ch_earnings", (currentEarnings + amount).toFixed(2));
    this.notify("ch_creator_analytics_updated", { creatorUsername: cleanUsername, amount, type, postId });
  }

  recordCardCheckout(title: string, amount: number, creatorUsername = "") {
    const transactions = this.getTransactions();
    const cleanUsername = creatorUsername ? creatorUsername.replace("@", "") : "";
    transactions.unshift({
      id: "tx_" + Date.now(),
      type: title.toLowerCase().includes("sub") ? "subscription" : title.toLowerCase().includes("unlock") ? "unlock" : "tip",
      title: `${title} via Card Checkout`,
      subtitle: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (cleanUsername ? ` â€¢ @${cleanUsername}` : ""),
      amount: 0
    });
    this.setItem("ch_transactions", JSON.stringify(transactions));
    this.notify("ch_wallet_updated", { balance: this.getWalletBalance(), transaction: transactions[0] });
  }

  adjustWalletBalance(amount: number, title: string, creatorUsername: string = "", postId?: string): number {
    const current = this.getWalletBalance();
    const updated = Math.max(0, current + amount);
    this.setItem("ch_wallet_balance", updated.toFixed(2));
    
    const transactions = this.getTransactions();
    const cleanUsername = creatorUsername ? creatorUsername.replace("@", "") : "";
    const tx: Transaction = {
      id: "tx_" + Date.now(),
      type: amount < 0
        ? title.toLowerCase().includes("sub")
          ? "subscription"
          : title.toLowerCase().includes("unlock")
            ? "unlock"
            : title.toLowerCase().includes("fundraiser") || title.toLowerCase().includes("contribution")
              ? "fundraiser"
              : "tip"
        : 'funds',
      title: title,
      subtitle: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (cleanUsername ? ` • @${cleanUsername}` : ""),
      amount: amount
    };
    transactions.unshift(tx);
    this.setItem("ch_transactions", JSON.stringify(transactions));
    if (amount < 0 && cleanUsername) {
      const ledgerType = tx.type === "subscription" || tx.type === "unlock" || tx.type === "fundraiser" ? tx.type : "tip";
      this.recordCreatorLedger(cleanUsername, ledgerType, Math.abs(amount), title, postId);
    }
    this.notify("ch_wallet_updated", { balance: updated, transaction: tx });
    return updated;
  }

  // Chats & Messaging
  getChats(creatorUsername: string): ChatMessage[] {
    const chats = JSON.parse(this.getItem("ch_chats", "{}"));
    return chats[creatorUsername] || [];
  }

  sendMessage(creatorUsername: string, text: string, isPPV = false, price = 0, mediaUrl = "", mediaType = "image", audioDuration = ""): ChatMessage {
    const chats = JSON.parse(this.getItem("ch_chats", "{}"));
    if (!chats[creatorUsername]) {
      chats[creatorUsername] = [];
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: text,
      time: time,
      isPPV,
      price,
      mediaUrl,
      mediaType,
      audioDuration
    };

    chats[creatorUsername].push(newMsg);
    this.setItem("ch_chats", JSON.stringify(chats));
    this.notify("ch_message_sent");

    // Simulate creator auto-reply after 1.5s
    const creator = this.getCreator(creatorUsername);
    if (creator) {
      setTimeout(() => {
        const updatedChats = JSON.parse(this.getItem("ch_chats", "{}"));
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
          replyText = `Hello! So happy to connect with you. I'm heading out to explore a new local market today, but I'll reply as soon as I'm back! ✨🍽️`;
        }
        
        const replyMsg: ChatMessage = {
          id: "msg_" + (Date.now() + 1),
          sender: creatorUsername,
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        updatedChats[creatorUsername].push(replyMsg);
        this.setItem("ch_chats", JSON.stringify(updatedChats));
        this.notify("ch_message_received");
      }, 1500);
    }

    return newMsg;
  }

  // Unlocking Premium Content
  isUnlocked(id: string): boolean {
    const unlocked: string[] = JSON.parse(this.getItem("ch_unlocked", "[]"));
    return unlocked.includes(id);
  }

  unlockContent(id: string, price: number, chargeWallet = true) {
    const unlocked: string[] = JSON.parse(this.getItem("ch_unlocked", "[]"));
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      this.setItem("ch_unlocked", JSON.stringify(unlocked));

      const post = this.getPosts(true).find(p => p.id === id);
      const creatorUsername = post?.creatorUsername || "";
      if (chargeWallet) {
        this.adjustWalletBalance(-price, `Unlock Premium Content`, creatorUsername, id);
      } else {
        this.recordCardCheckout("Unlock Premium Content", price, creatorUsername);
        this.recordCreatorLedger(creatorUsername, "unlock", price, `Unlock Premium Content`, id);
      }
      this.notify("ch_content_unlocked", { id });
    }
  }

  // Feed Posts
  getPosts(includeFuture = false): Post[] {
    const posts: Post[] = JSON.parse(this.getItem("ch_posts", "[]"));
    const reported: string[] = JSON.parse(this.getItem("ch_reported_posts", "[]"));
    const filtered = posts.filter(p => !reported.includes(p.id));
    if (includeFuture) return filtered;
    const now = Date.now();
    return filtered.filter(p => {
      if (!p.publishAt) return true;
      const pubDate = new Date(p.publishAt).getTime();
      return pubDate <= now;
    });
  }

  getReportedPosts(): string[] {
    return JSON.parse(this.getItem("ch_reported_posts", "[]"));
  }

  reportPost(postId: string) {
    const reported = this.getReportedPosts();
    if (!reported.includes(postId)) {
      reported.push(postId);
      this.setItem("ch_reported_posts", JSON.stringify(reported));
    }
    this.notify("ch_post_reported", { postId });
  }

  deletePost(postId: string) {
    const rawPosts = this.getItem("ch_posts", "[]");
    let posts: Post[] = JSON.parse(rawPosts);
    posts = posts.filter(p => p.id !== postId);
    this.setItem("ch_posts", JSON.stringify(posts));
    this.notify("ch_posts_updated");
  }

  addPost(
    content: string,
    mediaUrl = "",
    mediaType = "image",
    isPremium = false,
    price = 0,
    poll: Post["poll"] = null,
    fundraiser: Post["fundraiser"] = null,
    publishAt: string | null = null
  ): Post {
    const posts = this.getPosts(true);
    const newPost: Post = {
      id: "post_" + Date.now(),
      creatorUsername: this.getItem("ch_user_username", "arivera"),
      creatorName: this.getItem("ch_user_display_name", "Alex Rivera"),
      creatorAvatar: this.getItem("ch_user_avatar", "/assets/cb15617a79d7713ffa4a6de36f808a76.png"),
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
    this.setItem("ch_posts", JSON.stringify(posts));
    this.notify("ch_posts_updated");
    
    // Simulate background notifications/likes on new post after 5s
    setTimeout(() => {
      const creators = ["sarahcreates", "milaofficial", "ariamoon", "zionart"];
      const randomCreator = creators[Math.floor(Math.random() * creators.length)];
      const dbCreator = this.getCreator(randomCreator);
      const name = dbCreator ? dbCreator.name : "Sarah J.";
      const avatar = dbCreator ? dbCreator.avatar : "/assets/39bc5c3eed51d62c1022c60686bb459a.png";
      
      this.addNotification("like", name, avatar, "liked your new post");
      
      const currentSubs = parseInt(this.getItem("ch_subscribers", "1248")) || 1248;
      this.setItem("ch_subscribers", (currentSubs + 1).toString());
      
      const currentEarnings = parseFloat(this.getItem("ch_earnings", "14280.50")) || 14280.50;
      this.setItem("ch_earnings", (currentEarnings + 14.99).toFixed(2));
      
      this.notify("ch_post_liked_bg");
    }, 5000);

    return newPost;
  }

  repostPost(postId: string): Post {
    const posts = this.getPosts(true);
    const originalPost = posts.find(p => p.id === postId);
    if (!originalPost) {
      throw new Error("Post not found");
    }

    const newPost: Post = {
      ...originalPost,
      id: "post_repost_" + Date.now(),
      creatorUsername: this.getItem("ch_user_username", "arivera"),
      creatorName: this.getItem("ch_user_display_name", "Alex Rivera"),
      creatorAvatar: this.getItem("ch_user_avatar", "/assets/cb15617a79d7713ffa4a6de36f808a76.png"),
      isPinned: false,
      likes: 0,
      commentsCount: 0,
      time: "Just now",
      repostedFromId: postId,
      repostedBy: this.getItem("ch_user_username", "arivera"),
      publishAt: null
    };

    posts.unshift(newPost);
    this.setItem("ch_posts", JSON.stringify(posts));
    this.notify("ch_posts_updated");
    return newPost;
  }

  // Bookmarks
  getBookmarks(): string[] {
    return JSON.parse(this.getItem("ch_bookmarks", "[]"));
  }

  isBookmarked(postId: string): boolean {
    return this.getBookmarks().includes(postId);
  }

  toggleBookmark(postId: string): boolean {
    let bookmarks = this.getBookmarks();
    if (bookmarks.includes(postId)) {
      bookmarks = bookmarks.filter(id => id !== postId);
    } else {
      bookmarks.push(postId);
    }
    this.setItem("ch_bookmarks", JSON.stringify(bookmarks));
    this.notify("ch_bookmark_changed", { postId });
    return bookmarks.includes(postId);
  }

  getBookmarkedPosts(): Post[] {
    const bookmarks = this.getBookmarks();
    const posts = this.getPosts();
    return posts.filter(p => bookmarks.includes(p.id));
  }

  // Notifications
  getNotifications(): Notification[] {
    return JSON.parse(this.getItem("ch_notifications", "[]"));
  }

  addNotification(type: 'subscribe' | 'tip' | 'like' | 'comment', senderName: string, senderAvatar: string, text: string, amount: number | null = null): Notification {
    const notifications = this.getNotifications();
    const newNotif: Notification = {
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
    this.setItem("ch_notifications", JSON.stringify(notifications));
    this.notify("ch_notification_received");
    return newNotif;
  }

  markNotificationsRead() {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.read = true);
    this.setItem("ch_notifications", JSON.stringify(notifications));
    this.notify("ch_notification_received");
  }

  // Likes API
  isPostLiked(postId: string): boolean {
    const liked: string[] = JSON.parse(this.getItem("ch_liked_posts", "[]"));
    return liked.includes(postId);
  }

  toggleLikePost(postId: string) {
    let liked: string[] = JSON.parse(this.getItem("ch_liked_posts", "[]"));
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
    
    this.setItem("ch_liked_posts", JSON.stringify(liked));
    this.setItem("ch_posts", JSON.stringify(posts));
    this.notify("ch_post_liked", { postId, likes: post ? post.likes : 0, isLikedNow });
    return { isLiked: isLikedNow, likes: post ? post.likes : 0 };
  }

  // Comments API
  getComments(postId: string): PostComment[] {
    const commentsMap = JSON.parse(this.getItem("ch_post_comments", "{}"));
    return commentsMap[postId] || [];
  }

  addComment(postId: string, text: string, username = "arivera"): PostComment {
    const commentsMap = JSON.parse(this.getItem("ch_post_comments", "{}"));
    if (!commentsMap[postId]) {
      commentsMap[postId] = [];
    }
    
    const displayName = this.getItem("ch_user_display_name", "Alex Rivera");
    const avatar = this.getItem("ch_user_avatar", "/assets/5dc72593d711173af1fe7ab74be0fa56.png");

    const newComment = {
      id: "c_" + Date.now(),
      username: this.getItem("ch_user_username", username),
      name: displayName,
      avatar: avatar,
      text: text,
      time: "Just now"
    };
    
    commentsMap[postId].push(newComment);
    this.setItem("ch_post_comments", JSON.stringify(commentsMap));
    
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      this.setItem("ch_posts", JSON.stringify(posts));
    }
    
    this.notify("ch_comment_added", { postId, comment: newComment, count: post ? post.commentsCount : 0 });
    return newComment;
  }

  // Stories API
  getStories(): Story[] {
    return JSON.parse(this.getItem("ch_stories", "[]"));
  }

  markStoryRead(username: string) {
    const stories = this.getStories();
    const story = stories.find(s => s.username === username);
    if (story && story.isUnread) {
      story.isUnread = false;
      this.setItem("ch_stories", JSON.stringify(stories));
      this.notify("ch_stories_updated");
    }
  }

  addStory(username: string, name: string, avatar: string, storyUrl: string, location = ""): Story {
    const stories = this.getStories();
    let story = stories.find(s => s.username === username);
    const newSlide: StorySlide = {
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
    this.setItem("ch_stories", JSON.stringify(stories));
    this.notify("ch_stories_updated");
    return story;
  }

  // Vault API
  getVaultItems(): VaultItem[] {
    return JSON.parse(this.getItem("ch_vault", "[]"));
  }

  addVaultItem(fileName: string, fileUrl: string, mediaType: string): VaultItem {
    const vault = this.getVaultItems();
    const sizeMock = (Math.random() * 5 + 1).toFixed(1) + " MB";
    const dateMock = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const item: VaultItem = {
      id: "v_" + Date.now(),
      name: fileName,
      url: fileUrl,
      type: mediaType,
      date: dateMock,
      size: sizeMock,
      usageCount: 0
    };
    vault.unshift(item);
    this.setItem("ch_vault", JSON.stringify(vault));
    this.notify("ch_vault_updated");
    return item;
  }

  // Interactive Polls API
  votePoll(postId: string, optionIndex: number) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post && post.poll) {
      if (post.poll.votedOptionIndex === null || post.poll.votedOptionIndex === undefined) {
        post.poll.options[optionIndex].votes += 1;
        post.poll.votedOptionIndex = optionIndex;
        this.setItem("ch_posts", JSON.stringify(posts));
        this.notify("ch_posts_updated", { postId });
      }
    }
  }

  // Fundraiser API
  contributeFundraiser(postId: string, amount: number) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post && post.fundraiser) {
      if (isNaN(amount) || amount <= 0) return;
      
      this.adjustWalletBalance(-amount, `Contribution to @${post.creatorUsername}'s fundraiser`, post.creatorUsername, postId);
      
      post.fundraiser.current = parseFloat((post.fundraiser.current + amount).toFixed(2));
      this.setItem("ch_posts", JSON.stringify(posts));
      this.notify("ch_posts_updated", { postId });
    }
  }

  getCreatorAnalytics(username: string) {
    const cleanUsername = username.replace("@", "");
    const posts = this.getPosts(true).filter(p => p.creatorUsername === cleanUsername);
    const ledger = this.getCreatorLedger().filter(entry => entry.creatorUsername === cleanUsername);
    const totalEarnings = ledger.reduce((sum, entry) => sum + entry.amount, 0);
    const directTips = ledger
      .filter(entry => entry.type === "tip" || entry.type === "fundraiser")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);

    const earningsByPost = posts
      .map(post => ({
        id: post.id,
        title: post.content.split("\n")[0].slice(0, 80) || "Untitled post",
        earnings: ledger
          .filter(entry => entry.postId === post.id)
          .reduce((sum, entry) => sum + entry.amount, 0),
        likes: post.likes || 0,
        comments: post.commentsCount || 0,
        type: post.mediaType || "image",
      }))
      .sort((a, b) => (b.earnings - a.earnings) || (b.likes - a.likes))
      .slice(0, 5);

    const supportersMap = new Map<string, number>();
    ledger.forEach(entry => {
      supportersMap.set(entry.fanUsername, (supportersMap.get(entry.fanUsername) || 0) + entry.amount);
    });

    const topSupporters = Array.from(supportersMap.entries())
      .map(([fanUsername, totalContributed]) => ({
        username: fanUsername,
        name: fanUsername === this.getItem("ch_user_username", "arivera") ? this.getItem("ch_user_display_name", "Alex Rivera") : fanUsername,
        avatar: fanUsername === this.getItem("ch_user_username", "arivera") ? this.getItem("ch_user_avatar", "/assets/5dc72593d711173af1fe7ab74be0fa56.png") : "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
        totalContributed,
        joinedDate: "Active fan",
      }))
      .sort((a, b) => b.totalContributed - a.totalContributed)
      .slice(0, 5);

    return {
      totalEarnings,
      directTips,
      subscribers: parseInt(this.getItem("ch_subscribers", "0")) || 0,
      postCount: posts.length,
      totalLikes,
      totalComments,
      topPosts: earningsByPost,
      topSupporters,
    };
  }

  // Mass DMs / Broadcast Messaging API
  broadcastMessage(text: string, mediaUrl: string, mediaType: string, isPPV: boolean, price: number, targetList: string): string {
    const chats = JSON.parse(this.getItem("ch_chats", "{}"));
    const creators = Object.keys(DEFAULT_CREATORS);
    
    let targets: string[] = [];
    if (targetList === "subscribers") {
      targets = this.getSubscriptions();
    } else if (targetList === "favorites") {
      targets = this.getFavoriteCreators();
    }
    
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
        price: price || 0,
        mediaUrl: mediaUrl,
        mediaType: mediaType
      });
    });

    this.setItem("ch_chats", JSON.stringify(chats));
    this.notify("ch_message_sent");
    this.notify("ch_message_received");
    return msgId;
  }

  // User Profile API
  getUserProfile(): UserProfile {
    return {
      displayName: this.getItem("ch_user_display_name", "Alex Rivera"),
      username: this.getItem("ch_user_username", "arivera"),
      bio: this.getItem("ch_user_bio", "A creative professional."),
      avatar: this.getItem("ch_user_avatar", "/assets/5dc72593d711173af1fe7ab74be0fa56.png"),
      role: (this.getItem("ch_user_role", "fan") === "creator" ? "creator" : "fan") as 'creator' | 'fan',
      coverPhoto: this.getItem("ch_user_cover", "/assets/082f4723389abb44b68b64dfc082268b.png"),
      location: this.getItem("ch_user_location", ""),
      website: this.getItem("ch_user_website", ""),
      joinedDate: this.getItem("ch_user_joined", "Joined 2026"),
    };
  }

  setUserProfile(data: Partial<UserProfile>) {
    if (data.displayName !== undefined) this.setItem("ch_user_display_name", data.displayName);
    if (data.username !== undefined) this.setItem("ch_user_username", data.username);
    if (data.bio !== undefined) this.setItem("ch_user_bio", data.bio);
    if (data.avatar !== undefined) this.setItem("ch_user_avatar", data.avatar);
    if (data.role !== undefined) this.setItem("ch_user_role", data.role);
    if (data.coverPhoto !== undefined) this.setItem("ch_user_cover", data.coverPhoto);
    if (data.location !== undefined) this.setItem("ch_user_location", data.location);
    if (data.website !== undefined) this.setItem("ch_user_website", data.website);
    if (data.joinedDate !== undefined) this.setItem("ch_user_joined", data.joinedDate);
    this.notify("ch_profile_updated");
  }

  getPostsByUser(username: string, includeFuture = false): Post[] {
    const posts = this.getPosts(includeFuture);
    return posts.filter(p => p.creatorUsername === username);
  }

  // Linked Cards API
  getLinkedCards(): LinkedCard[] {
    return JSON.parse(this.getItem("ch_linked_cards", "[]"));
  }

  addLinkedCard(holder: string, number: string, expiry: string): LinkedCard {
    const cards = this.getLinkedCards();
    const newCard: LinkedCard = {
      id: "card_" + Date.now(),
      holder,
      number,
      expiry,
      isDefault: cards.length === 0
    };
    cards.push(newCard);
    this.setItem("ch_linked_cards", JSON.stringify(cards));
    this.notify("ch_cards_updated");
    return newCard;
  }

  deleteLinkedCard(id: string) {
    let cards = this.getLinkedCards();
    const wasDefault = cards.find(c => c.id === id)?.isDefault;
    cards = cards.filter(c => c.id !== id);
    if (wasDefault && cards.length > 0) {
      cards[0].isDefault = true;
    }
    this.setItem("ch_linked_cards", JSON.stringify(cards));
    this.notify("ch_cards_updated");
  }

  setDefaultCard(id: string) {
    const cards = this.getLinkedCards();
    cards.forEach(c => c.isDefault = c.id === id);
    this.setItem("ch_linked_cards", JSON.stringify(cards));
    this.notify("ch_cards_updated");
  }

  // Custom Lists API
  getCustomLists(): CustomList[] {
    return JSON.parse(this.getItem("ch_custom_lists", "[]"));
  }

  createCustomList(name: string): CustomList {
    const lists = this.getCustomLists();
    const newList: CustomList = {
      id: "list_" + Date.now(),
      name,
      usernames: []
    };
    lists.push(newList);
    this.setItem("ch_custom_lists", JSON.stringify(lists));
    this.notify("ch_lists_updated");
    return newList;
  }

  deleteCustomList(id: string) {
    let lists = this.getCustomLists();
    lists = lists.filter(l => l.id !== id);
    this.setItem("ch_custom_lists", JSON.stringify(lists));
    this.notify("ch_lists_updated");
  }

  addUserToList(listId: string, username: string) {
    const lists = this.getCustomLists();
    const list = lists.find(l => l.id === listId);
    if (list && !list.usernames.includes(username)) {
      list.usernames.push(username);
      this.setItem("ch_custom_lists", JSON.stringify(lists));
      this.notify("ch_lists_updated");
    }
  }

  removeUserFromList(listId: string, username: string) {
    const lists = this.getCustomLists();
    const list = lists.find(l => l.id === listId);
    if (list) {
      list.usernames = list.usernames.filter(u => u !== username);
      this.setItem("ch_custom_lists", JSON.stringify(lists));
      this.notify("ch_lists_updated");
    }
  }

  // Auto-Renew Subscriptions Details API
  getSubscriptionRenewSettings(): Record<string, boolean> {
    return JSON.parse(this.getItem("ch_sub_renew_settings", "{}"));
  }

  toggleSubscriptionRenew(username: string): boolean {
    const renew = this.getSubscriptionRenewSettings();
    renew[username] = !renew[username];
    this.setItem("ch_sub_renew_settings", JSON.stringify(renew));
    this.notify("ch_subscriptions_updated");
    return renew[username];
  }

  getSubDetailsList(): SubDetails[] {
    const subs = this.getSubscriptions();
    const renewSettings = this.getSubscriptionRenewSettings();
    const creators = this.getCreators();
    
    // Build list of details
    const activeDetails: SubDetails[] = subs.map(username => {
      const creator = creators[username];
      return {
        username,
        name: creator ? creator.name : username,
        avatar: creator ? creator.avatar : "/assets/be708ecefc41b969ee64c477f954168c.png",
        price: creator ? creator.subPrice : 9.99,
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        autoRenew: renewSettings[username] !== false, // default true
        status: 'active' as const
      };
    });

    // Mock expired subscriptions for parity with OnlyFans UI
    const expiredDetails: SubDetails[] = [
      {
        username: "amouranth",
        name: "Amouranth",
        avatar: "/assets/31ccb1dded9dd42d60e1b0ab43ae8750.png",
        price: 11.99,
        expiryDate: "May 10, 2026",
        autoRenew: false,
        status: 'expired' as const
      },
      {
        username: "bhadbhabie",
        name: "Bhad Bhabie",
        avatar: "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
        price: 19.99,
        expiryDate: "Apr 28, 2026",
        autoRenew: false,
        status: 'expired' as const
      }
    ].filter(exp => !subs.includes(exp.username)); // only include if not active

    return [...activeDetails, ...expiredDetails];
  }
}

// Next-safe Singleton instantiation
export const mockDb = new MockDatabase();
