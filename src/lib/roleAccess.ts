export type AccountRole = "fan" | "creator";

export const roleLabel: Record<AccountRole, string> = {
  fan: "Visitor",
  creator: "Creator",
};

export const roleHome: Record<AccountRole, string> = {
  fan: "/",
  creator: "/studio",
};

export type NavLink = {
  href: string;
  label: string;
  icon: string;
  key: string;
  roles: AccountRole[];
  description?: string;
  badgeValue?: number;
};

export const mainNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: "home", key: "home", roles: ["fan", "creator"] },
  { href: "/explore", label: "Explore", icon: "explore", key: "explore", roles: ["fan"] },
  { href: "/live", label: "Live", icon: "live_tv", key: "live", roles: ["fan", "creator"] },
  { href: "/notifications", label: "Notifications", icon: "notifications", key: "notifications", roles: ["fan", "creator"] },
  { href: "/chat", label: "Messages", icon: "chat", key: "chat", roles: ["fan", "creator"] },
  { href: "/collections", label: "Collections", icon: "collections_bookmark", key: "collections", roles: ["fan", "creator"] },
  { href: "/subscriptions", label: "Subscriptions", icon: "card_membership", key: "subscriptions", roles: ["fan"] },
  { href: "/lists", label: "Lists", icon: "list_alt", key: "lists", roles: ["fan", "creator"] },
  { href: "/create-post", label: "Create Post", icon: "add_circle", key: "create-post", roles: ["creator"] },
  { href: "/studio", label: "Creator Studio", icon: "dashboard", key: "studio", roles: ["creator"] },
  { href: "/studio/posts", label: "Manage Posts", icon: "library_books", key: "studio-posts", roles: ["creator"] },
  { href: "/vault", label: "Media Vault", icon: "perm_media", key: "vault", roles: ["creator"] },
  { href: "/profile", label: "Profile", icon: "person", key: "profile", roles: ["fan", "creator"] },
  { href: "/wallet", label: "Wallet", icon: "account_balance_wallet", key: "wallet", roles: ["fan", "creator"] },
  { href: "/settings", label: "Settings", icon: "settings", key: "settings", roles: ["fan", "creator"] },
];

export const mobileNavLinks: NavLink[] = [
  { href: "/", label: "Feed", icon: "home", key: "home", roles: ["fan", "creator"] },
  { href: "/explore", label: "Explore", icon: "explore", key: "explore", roles: ["fan"] },
  { href: "/studio", label: "Studio", icon: "dashboard", key: "studio", roles: ["creator"] },
  { href: "/live", label: "Live", icon: "live_tv", key: "live", roles: ["fan", "creator"] },
  { href: "/chat", label: "Chat", icon: "chat", key: "chat", roles: ["fan", "creator"] },
  { href: "/notifications", label: "Alerts", icon: "notifications", key: "notifications", roles: ["fan", "creator"] },
  { href: "/profile", label: "Profile", icon: "person", key: "profile", roles: ["fan", "creator"] },
];

export const settingsLinks: NavLink[] = [
  { href: "/settings/edit-profile", label: "Edit Profile", icon: "edit", key: "edit-profile", roles: ["fan", "creator"], description: "Name, handle, bio, avatar" },
  { href: "/settings/appearance", label: "Appearance", icon: "palette", key: "appearance", roles: ["fan", "creator"], description: "Change client visual theme" },
  { href: "/settings/email", label: "Email", icon: "mail", key: "email", roles: ["fan", "creator"], description: "Update linked email" },
  { href: "/settings/security", label: "Security & Password", icon: "lock", key: "security", roles: ["fan", "creator"], description: "2FA, biometrics, password" },
  { href: "/settings/blocked-users", label: "Blocked Users", icon: "block", key: "blocked-users", roles: ["fan", "creator"], description: "Manage restricted accounts" },
  { href: "/settings/monetization", label: "Monetization", icon: "monetization_on", key: "monetization", roles: ["creator"], description: "Pricing, bank payout" },
  { href: "/settings/verification", label: "Identity Verification", icon: "verified_user", key: "verification", roles: ["creator"], description: "KYC records, badge" },
  { href: "/settings/referrals", label: "Referrals", icon: "group", key: "referrals", roles: ["creator"], description: "Earn from creator invites" },
  { href: "/settings/payments", label: "Payment Methods", icon: "credit_card", key: "payments", roles: ["fan", "creator"], description: "Cards for subscriptions" },
  { href: "/settings/delete-account", label: "Delete Account", icon: "delete_forever", key: "delete-account", roles: ["fan", "creator"], description: "Permanently erase profile" },
];

export const filterByRole = <T extends { roles: AccountRole[] }>(items: T[], role: AccountRole) =>
  items.filter((item) => item.roles.includes(role));
