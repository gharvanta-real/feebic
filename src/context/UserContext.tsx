"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { mockDb, UserProfile } from "@/lib/mockDb";

interface UserContextType {
  user: UserProfile | null;
  walletBalance: number;
  unreadNotificationsCount: number;
  subscriptions: string[];
  blockedUsers: string[];
  favoriteCreators: string[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  refreshUserProfile: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  adjustBalance: (amount: number, title: string, creatorUsername?: string) => void;
  subscribeToCreator: (creatorUsername: string, price?: number) => void;
  unsubscribeFromCreator: (creatorUsername: string) => void;
  toggleBlock: (username: string) => boolean;
  toggleFavorite: (username: string) => boolean;
  markNotificationsAsRead: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(450.00);
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

  const refreshUserProfile = () => {
    if (typeof window === 'undefined') return;
    
    // Initialize mock database if not already
    mockDb.init();
    
    const profile = mockDb.getUserProfile();
    setUser(prev => {
      if (prev && JSON.stringify(prev) === JSON.stringify(profile)) return prev;
      return profile;
    });
    
    const balance = mockDb.getWalletBalance();
    setWalletBalance(prev => (prev === balance ? prev : balance));

    const subs = mockDb.getSubscriptions();
    setSubscriptions(prev => {
      if (JSON.stringify(prev) === JSON.stringify(subs)) return prev;
      return subs;
    });

    const blocked = mockDb.getBlockedUsers();
    setBlockedUsers(prev => {
      if (JSON.stringify(prev) === JSON.stringify(blocked)) return prev;
      return blocked;
    });

    const favs = mockDb.getFavoriteCreators();
    setFavoriteCreators(prev => {
      if (JSON.stringify(prev) === JSON.stringify(favs)) return prev;
      return favs;
    });
    
    const notifs = mockDb.getNotifications();
    const unreadCount = notifs.filter(n => !n.read).length;
    setUnreadNotificationsCount(prev => (prev === unreadCount ? prev : unreadCount));
  };

  useEffect(() => {
    setTimeout(() => {
      refreshUserProfile();
    }, 0);

    // Event listeners for cross-component synchronizations
    const handleProfileUpdate = () => refreshUserProfile();
    const handleWalletUpdate = () => {
      setWalletBalance(mockDb.getWalletBalance());
      refreshUserProfile();
    };
    const handleSubscriptionsUpdate = () => {
      setSubscriptions(mockDb.getSubscriptions());
      refreshUserProfile();
    };
    const handleBlockedUsersUpdate = () => {
      setBlockedUsers(mockDb.getBlockedUsers());
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

  const updateProfile = (data: Partial<UserProfile>) => {
    mockDb.setUserProfile(data);
    refreshUserProfile();
  };

  const adjustBalance = (amount: number, title: string, creatorUsername = "") => {
    mockDb.adjustWalletBalance(amount, title, creatorUsername);
    setWalletBalance(mockDb.getWalletBalance());
  };

  const subscribeToCreator = (creatorUsername: string, price = 0) => {
    mockDb.subscribe(creatorUsername, price);
    setSubscriptions(mockDb.getSubscriptions());
    setWalletBalance(mockDb.getWalletBalance());
  };

  const unsubscribeFromCreator = (creatorUsername: string) => {
    mockDb.unsubscribe(creatorUsername);
    setSubscriptions(mockDb.getSubscriptions());
  };

  const toggleBlock = (username: string): boolean => {
    const res = mockDb.toggleBlockUser(username);
    setBlockedUsers(mockDb.getBlockedUsers());
    setSubscriptions(mockDb.getSubscriptions());
    return res;
  };

  const toggleFavorite = (username: string): boolean => {
    const res = mockDb.toggleFavoriteCreator(username);
    setFavoriteCreators(mockDb.getFavoriteCreators());
    return res;
  };

  const markNotificationsAsRead = () => {
    mockDb.markNotificationsRead();
    setUnreadNotificationsCount(0);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        walletBalance,
        unreadNotificationsCount,
        subscriptions,
        blockedUsers,
        favoriteCreators,
        toastMessage,
        showToast,
        refreshUserProfile,
        updateProfile,
        adjustBalance,
        subscribeToCreator,
        unsubscribeFromCreator,
        toggleBlock,
        toggleFavorite,
        markNotificationsAsRead
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
