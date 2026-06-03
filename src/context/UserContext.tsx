"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { mockDb, UserProfile } from "@/lib/mockDb";
import { apiClient, ApiError } from "@/lib/apiClient";


interface UserContextType {
  user: UserProfile | null;
  authStatus: "checking" | "syncing" | "ready";
  authError: string | null;
  walletBalance: number;
  unreadNotificationsCount: number;
  subscriptions: string[];
  blockedUsers: string[];
  favoriteCreators: string[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  refreshUserProfile: () => void;
  retryAuthSync: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  adjustBalance: (amount: number, title: string, creatorUsername?: string) => Promise<void>;
  subscribeToCreator: (creatorUsername: string, price?: number) => Promise<boolean>;
  unsubscribeFromCreator: (creatorUsername: string) => Promise<boolean>;
  toggleBlock: (username: string) => Promise<boolean>;
  toggleFavorite: (username: string) => Promise<boolean>;
  markNotificationsAsRead: () => void;
  loginAsSeedUser: (email: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

type BackendUserProfile = {
  display_name?: string;
  displayName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  role?: "creator" | "fan";
  cover_photo?: string;
  coverPhoto?: string;
  location?: string;
  website?: string;
  email?: string;
  kyc_verified?: boolean;
  kycVerified?: boolean;
  kyc_uploaded?: boolean;
  kycUploaded?: boolean;
  kyc_name?: string;
  kycName?: string;
  kyc_document_type?: string;
  kycDocumentType?: string;
  two_factor?: boolean;
  twoFactor?: boolean;
  biometric?: boolean;
  discount_active?: boolean;
  discountActive?: boolean;
  discount_percent?: number;
  discountPercent?: number;
  calls_enabled?: boolean;
  callsEnabled?: boolean;
  call_rate?: number;
  callRate?: number;
  sub_price?: number;
  subPrice?: number;
};

type BackendSubscription = {
  username: string;
  status: string;
};

type BackendRelationships = {
  favorites: string[];
  blocked: string[];
};

const normalizeProfile = (profile: BackendUserProfile): UserProfile => ({
  displayName: profile.displayName || profile.display_name || "Felbic User",
  username: profile.username || "felbic_user",
  bio: profile.bio || "",
  avatar: profile.avatar || "/assets/39bc5c3eed51d62c1022c60686bb459a.png",
  role: profile.role === "creator" ? "creator" : "fan",
  coverPhoto: profile.coverPhoto || profile.cover_photo || "/assets/cb15617a79d7713ffa4a6de36f808a76.png",
  location: profile.location || "",
  website: profile.website || "",
  joinedDate: "Joined 2026",
  email: profile.email || "",
  kycVerified: profile.kycVerified ?? profile.kyc_verified ?? false,
  kycUploaded: profile.kycUploaded ?? profile.kyc_uploaded ?? false,
  kycName: profile.kycName || profile.kyc_name || "",
  kycDocumentType: profile.kycDocumentType || profile.kyc_document_type || "",
  twoFactor: profile.twoFactor ?? profile.two_factor ?? false,
  biometric: profile.biometric ?? true,
  discountActive: profile.discountActive ?? profile.discount_active ?? false,
  discountPercent: profile.discountPercent ?? profile.discount_percent ?? 20,
  callsEnabled: profile.callsEnabled ?? profile.calls_enabled ?? false,
  callRate: profile.callRate ?? profile.call_rate ?? 5.00,
  subPrice: profile.subPrice ?? profile.sub_price ?? 9.99,
});

const getErrorMessage = (err: unknown, fallback: string) => (
  err instanceof Error ? err.message : fallback
);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<"checking" | "syncing" | "ready">("checking");
  const [authError, setAuthError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [favoriteCreators, setFavoriteCreators] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const logout = () => {
    localStorage.removeItem("ch_token");
    localStorage.removeItem("ch_backend_unavailable");
    localStorage.setItem("ch_logged_out", "true");
    setUser(null);
    setWalletBalance(0);
    setBlockedUsers([]);
    setFavoriteCreators([]);
    setSubscriptions([]);
    setAuthError(null);
    setAuthStatus("ready");
  };

  const refreshUserProfile = async () => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem("ch_token");
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const profile = normalizeProfile(await apiClient.get<BackendUserProfile>("/users/profile"));
      setUser(prev => {
        if (prev && JSON.stringify(prev) === JSON.stringify(profile)) return prev;
        return profile;
      });

      // Update localStorage with normalized profile details and mark onboarding as complete
      localStorage.setItem("ch_user_username", profile.username);
      localStorage.setItem("ch_user_display_name", profile.displayName);
      localStorage.setItem("ch_user_avatar", profile.avatar);
      localStorage.setItem("ch_user_role", profile.role);
      localStorage.setItem("ch_user_bio", profile.bio);
      localStorage.setItem("ch_onboarding_done", "true");

      const walletState = await apiClient.get<{ balance: number }>("/wallet");
      setWalletBalance(walletState.balance);
      setAuthError(null);

      const subs = await apiClient.get<BackendSubscription[]>("/users/subscriptions");
      setSubscriptions(subs.filter((s) => s.status === "active").map((s) => s.username));

      const relationships = await apiClient.get<BackendRelationships>("/users/relationships");
      setBlockedUsers(relationships.blocked || []);
      setFavoriteCreators(relationships.favorites || []);

      const notifs = mockDb.getNotifications();
      const unreadCount = notifs.filter(n => !n.read).length;
      setUnreadNotificationsCount(prev => (prev === unreadCount ? prev : unreadCount));
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.status === 401) {
        logout();
      } else {
        setAuthError(getErrorMessage(err, "Unable to refresh profile from the API."));
      }
    }
  };

  const retryAuthSync = async () => {
    setAuthStatus("syncing");
    setAuthError(null);
    if (typeof window === "undefined" || !localStorage.getItem("ch_token")) {
      setUser(null);
      setAuthStatus("ready");
      return;
    }
    await refreshUserProfile();
    setAuthStatus("ready");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("ch_token");
    if (!token) {
      setUser(null);
      setAuthError(null);
      setAuthStatus("ready");
      return;
    }
    retryAuthSync();
  }, []);

  useEffect(() => {

    // Event listeners for cross-component synchronizations
    const handleProfileUpdate = () => refreshUserProfile();
    const handleWalletUpdate = () => {
      setWalletBalance(mockDb.getWalletBalance());
      refreshUserProfile();
    };
    const handleSubscriptionsUpdate = () => {
      refreshUserProfile();
    };
    const handleBlockedUsersUpdate = () => {
      refreshUserProfile();
    };
    const handleNotifsUpdate = () => {
      const notifs = mockDb.getNotifications();
      setUnreadNotificationsCount(notifs.filter(n => !n.read).length);
    };

    window.addEventListener("ch_profile_updated", handleProfileUpdate);
    window.addEventListener("ch_wallet_updated", handleWalletUpdate);
    window.addEventListener("ch_subscriptions_updated", handleSubscriptionsUpdate);
    window.addEventListener("ch_blocked_users_updated", handleBlockedUsersUpdate);
    window.addEventListener("ch_notification_received", handleNotifsUpdate);
    
    // Storage listener for cross-tab synchronizations
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith("ch_") || e.key === "ch_notifications")) {
        refreshUserProfile();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("ch_profile_updated", handleProfileUpdate);
      window.removeEventListener("ch_wallet_updated", handleWalletUpdate);
      window.removeEventListener("ch_subscriptions_updated", handleSubscriptionsUpdate);
      window.removeEventListener("ch_blocked_users_updated", handleBlockedUsersUpdate);
      window.removeEventListener("ch_notification_received", handleNotifsUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!user) {
      showToast("Profile is not loaded yet");
      return false;
    }

    const nextProfile = { ...user, ...data };
    const payload = {
      username: nextProfile.username,
      display_name: nextProfile.displayName,
      bio: nextProfile.bio,
      avatar: nextProfile.avatar,
      cover_photo: nextProfile.coverPhoto,
      location: nextProfile.location,
      website: nextProfile.website,
      role: nextProfile.role,
      sub_price: nextProfile.subPrice,
    };

    try {
      const response = await apiClient.put<{ token?: string }>("/users/profile", payload);
      if (response?.token) {
        localStorage.setItem("ch_token", response.token);
      }
      await refreshUserProfile();
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Profile update failed on the API."));
      return false;
    }
  };

  const adjustBalance = async (amount: number, title: string, creatorUsername = "") => {
    try {
      if (amount > 0) {
        const res = await apiClient.post<{ balance: number }>("/wallet/deposit", { amount });
        setWalletBalance(res.balance);
        showToast(`Deposited ₹${amount.toFixed(2)} successfully!`);
      } else {
        const tipAmt = Math.abs(amount);
        const res = await apiClient.post<{ balance: number }>("/wallet/tip", {
          creator_id: creatorUsername,
          amount: tipAmt,
          message: title,
        });
        setWalletBalance(res.balance);
        showToast(`Tipped ₹${tipAmt.toFixed(2)} to @${creatorUsername}!`);
      }
      await refreshUserProfile();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Wallet transaction failed on the API."));
    }
  };

  const subscribeToCreator = async (creatorUsername: string, _price = 0): Promise<boolean> => {
    void _price;
    try {
      const res = await apiClient.post<{ balance: number }>("/wallet/subscribe", {
        creator_id: creatorUsername,
      });
      setWalletBalance(res.balance);
      await refreshUserProfile();
      showToast(`Successfully subscribed to @${creatorUsername}!`);
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Subscription failed on the API."));
      return false;
    }
  };


  const unsubscribeFromCreator = async (creatorUsername: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/wallet/subscribe/${creatorUsername}`);
      await refreshUserProfile();
      showToast(`Cancelled subscription to @${creatorUsername}`);
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to cancel subscription"));
      return false;
    }
  };

  const toggleBlock = async (username: string): Promise<boolean> => {
    try {
      const res = await apiClient.post<{ is_blocked: boolean }>(`/users/blocks/${username}`);
      setBlockedUsers((prev) => (
        res.is_blocked
          ? Array.from(new Set([...prev, username]))
          : prev.filter((u) => u !== username)
      ));
      window.dispatchEvent(new CustomEvent("ch_blocked_users_updated", { detail: { username } }));
      return res.is_blocked;
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to update block list"));
      return blockedUsers.includes(username);
    }
  };

  const toggleFavorite = async (username: string): Promise<boolean> => {
    try {
      const res = await apiClient.post<{ is_favorite: boolean }>(`/users/favorites/${username}`);
      setFavoriteCreators((prev) => (
        res.is_favorite
          ? Array.from(new Set([...prev, username]))
          : prev.filter((u) => u !== username)
      ));
      window.dispatchEvent(new CustomEvent("ch_favorite_creators_updated", { detail: { username, isFavorite: res.is_favorite } }));
      return res.is_favorite;
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to update favorites"));
      return favoriteCreators.includes(username);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      await apiClient.post("/notifications/read");
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error("Failed to mark notifications read on server:", err);
    }
  };

  const loginAsSeedUser = async (email: string) => {
    setAuthStatus("syncing");
    try {
      const response = await apiClient.post<{ token: string; user?: BackendUserProfile }>("/auth/login", {
        email: email,
        password: "password123"
      });
      localStorage.setItem("ch_token", response.token);
      localStorage.removeItem("ch_logged_out");
      localStorage.removeItem("ch_backend_unavailable");
      if (response.user) {
        setUser(normalizeProfile(response.user));
      }
      await refreshUserProfile();
      showToast(`Switched user to ${response.user?.username || email}`);
      window.dispatchEvent(new CustomEvent("ch_profile_updated"));
    } catch (err) {
      showToast(getErrorMessage(err, "User switch failed"));
    } finally {
      setAuthStatus("ready");
    }
  };




  return (
    <UserContext.Provider
      value={{
        user,
        authStatus,
        authError,
        walletBalance,
        unreadNotificationsCount,
        subscriptions,
        blockedUsers,
        favoriteCreators,
        toastMessage,
        showToast,
        refreshUserProfile,
        retryAuthSync,
        updateProfile,
        adjustBalance,
        subscribeToCreator,
        unsubscribeFromCreator,
        toggleBlock,
        toggleFavorite,
        markNotificationsAsRead,
        loginAsSeedUser,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
