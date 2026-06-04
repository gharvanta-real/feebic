package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"server/internal/admin"
	"server/internal/adminauth"
	"server/internal/auth"
	"server/internal/chat"
	"server/internal/live"
	"server/internal/media"
	"server/internal/middleware"
	"server/internal/notifications"
	"server/internal/posts"
	"server/internal/stories"
	"server/internal/users"
	"server/internal/vault"
	"server/internal/wallet"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// ── 1. Public Auth Routes ──────────────────────────────────────────────────
	authGroup := api.Group("/auth")
	authGroup.Post("/register/start", auth.StartRegistration)
	authGroup.Post("/register/verify", auth.VerifyRegistration)
	authGroup.Post("/register", auth.RegisterDisabled)
	authGroup.Post("/login", auth.Login)
	authGroup.Post("/password/reset/start", auth.StartPasswordReset)
	authGroup.Post("/password/reset/verify", auth.VerifyPasswordReset)
	authGroup.Get("/username/:username", auth.CheckUsername)

	// ── 2. Admin Auth Routes (DEDICATED — separate from user auth) ─────────────
	// These use AdminJWTSecret and admin_staff table — NOT the users table
	adminAuthGroup := api.Group("/admin-auth")
	adminAuthGroup.Post("/login", adminauth.Login)            // Step 1: email+password → step1_token
	adminAuthGroup.Post("/totp/verify", adminauth.VerifyTOTP) // Step 2: TOTP code → full admin JWT
	adminAuthGroup.Post("/logout", middleware.RequireAdminAuth(), adminauth.Logout)
	adminAuthGroup.Get("/me", middleware.RequireAdminAuth(), adminauth.GetMe)
	// TOTP setup routes (require valid admin JWT but TOTP not yet enabled)
	adminAuthGroup.Post("/totp/setup", middleware.RequireAdminStep1Auth(), adminauth.SetupTOTP)
	adminAuthGroup.Post("/totp/confirm", middleware.RequireAdminStep1Auth(), adminauth.ConfirmTOTP)
	// Staff management routes
	adminAuthGroup.Get("/staff", middleware.RequireAdminAuth(), adminauth.GetStaffList)
	adminAuthGroup.Post("/staff", middleware.RequireAdminAuth(), middleware.RequireAdminRole("admin"), adminauth.CreateStaff)
	adminAuthGroup.Put("/staff/:id/role", middleware.RequireAdminAuth(), middleware.RequireAdminRole("admin"), adminauth.UpdateStaffRole)
	adminAuthGroup.Delete("/staff/:id", middleware.RequireAdminAuth(), middleware.RequireAdminRole("admin"), adminauth.DeactivateStaff)
	adminAuthGroup.Post("/staff/:id/reactivate", middleware.RequireAdminAuth(), middleware.RequireAdminRole("admin"), adminauth.ReactivateStaff)

	// ── 3. Users & Profiles Group (User Auth) ─────────────────────────────────
	usersGroup := api.Group("/users")
	usersGroup.Get("/profile", middleware.RequireAuth(), users.GetProfile)
	usersGroup.Put("/profile", middleware.RequireAuth(), users.UpdateProfile)
	usersGroup.Get("/subscriptions", middleware.RequireAuth(), users.GetSubscriptions)
	usersGroup.Get("/relationships", middleware.RequireAuth(), users.GetRelationships)
	usersGroup.Post("/favorites/:username", middleware.RequireAuth(), users.ToggleFavorite)
	usersGroup.Post("/blocks/:username", middleware.RequireAuth(), users.ToggleBlock)
	usersGroup.Post("/kyc", middleware.RequireAuth(), users.SubmitKYC)
	usersGroup.Post("/security/password", middleware.RequireAuth(), users.ChangePassword)
	usersGroup.Put("/security/settings", middleware.RequireAuth(), users.UpdateSecurity)
	usersGroup.Put("/monetization/discount", middleware.RequireAuth(), users.UpdateDiscount)
	usersGroup.Put("/monetization/calls", middleware.RequireAuth(), users.UpdateCalls)
	usersGroup.Delete("/account", middleware.RequireAuth(), users.DeleteAccount)
	usersGroup.Get("/creators", users.ListCreators)
	usersGroup.Get("/creator/:username", users.GetCreatorByUsername)

	// ── 4. Posts & Feed Group ─────────────────────────────────────────────────
	postsGroup := api.Group("/posts")
	postsGroup.Get("/", posts.GetFeed)
	postsGroup.Post("/interaction", middleware.RequireAuth(), posts.RecordInteraction)
	postsGroup.Get("/bookmarks", middleware.RequireAuth(), posts.GetBookmarks)
	postsGroup.Get("/mine", middleware.RequireAuth(), posts.GetMyPosts)
	postsGroup.Post("/", middleware.RequireAuth(), posts.CreatePost)
	postsGroup.Get("/:id/comments", posts.GetComments)
	postsGroup.Post("/:id/comments", middleware.RequireAuth(), posts.AddComment)
	postsGroup.Post("/:id/like", middleware.RequireAuth(), posts.ToggleLike)
	postsGroup.Post("/:id/bookmark", middleware.RequireAuth(), posts.ToggleBookmark)
	postsGroup.Post("/:id/unlock", middleware.RequireAuth(), posts.UnlockPost)
	postsGroup.Post("/:id/poll/vote", middleware.RequireAuth(), posts.VotePoll)
	postsGroup.Post("/:id/fundraiser/contribute", middleware.RequireAuth(), posts.ContributeFundraiser)
	postsGroup.Post("/:id/repost", middleware.RequireAuth(), posts.RepostPost)
	postsGroup.Post("/:id/report", middleware.RequireAuth(), posts.ReportPost)
	postsGroup.Put("/:id", middleware.RequireAuth(), posts.UpdatePost)
	postsGroup.Delete("/:id", middleware.RequireAuth(), posts.DeletePost)

	// ── 5. Wallet & Transactions (User Auth) ──────────────────────────────────
	walletGroup := api.Group("/wallet")
	walletGroup.Use(middleware.RequireAuth())
	walletGroup.Get("/", wallet.GetWalletState)
	walletGroup.Post("/deposit", wallet.Deposit)
	walletGroup.Post("/tip", wallet.TipCreator)
	walletGroup.Post("/subscribe", wallet.SubscribeToCreator)
	walletGroup.Delete("/subscribe/:creator", wallet.CancelSubscription)
	walletGroup.Get("/cards", wallet.GetCards)
	walletGroup.Post("/cards", wallet.AddCard)
	walletGroup.Delete("/cards/:id", wallet.DeleteCard)
	walletGroup.Put("/cards/:id/default", wallet.SetDefaultCard)
	walletGroup.Get("/bank", wallet.GetBankAccount)
	walletGroup.Post("/bank", wallet.SaveBankAccount)

	// ── 6. Notifications ──────────────────────────────────────────────────────
	notifGroup := api.Group("/notifications")
	notifGroup.Use(middleware.RequireAuth())
	notifGroup.Get("/", notifications.GetNotifications)
	notifGroup.Post("/read", notifications.MarkRead)

	// ── 7. Vault Assets ───────────────────────────────────────────────────────
	vaultGroup := api.Group("/vault")
	vaultGroup.Use(middleware.RequireAuth())
	vaultGroup.Get("/", vault.GetVault)
	vaultGroup.Post("/", vault.AddToVault)
	vaultGroup.Delete("/:id", vault.DeleteFromVault)

	// ── 8. Stories ────────────────────────────────────────────────────────────
	storiesGroup := api.Group("/stories")
	storiesGroup.Get("/", stories.GetActiveStories)
	storiesGroup.Use(middleware.RequireAuth())
	storiesGroup.Post("/", stories.CreateStory)
	storiesGroup.Post("/:id/view", stories.MarkStoryViewed)

	// ── 9. Direct Messages / Chat ─────────────────────────────────────────────
	chatGroup := api.Group("/chat")
	chatGroup.Get("/ws", chat.WebSocketUpgradeMiddleware, websocket.New(chat.WebSocketHandler))
	chatGroup.Use(middleware.RequireAuth())
	chatGroup.Get("/conversations", chat.GetConversations)
	chatGroup.Get("/messages/:username", chat.GetMessages)
	chatGroup.Post("/messages", chat.SendMessage)
	chatGroup.Post("/broadcast", chat.BroadcastMessage)

	// ── 10. Live Streaming ────────────────────────────────────────────────────
	liveGroup := api.Group("/live")
	liveGroup.Get("/active", live.GetActiveStream)
	liveGroup.Use(middleware.RequireAuth())
	liveGroup.Post("/start", live.StartStream)
	liveGroup.Post("/:id/end", live.EndStream)
	liveGroup.Post("/:id/comments", live.AddComment)
	liveGroup.Post("/:id/reactions", live.AddReaction)

	// ── 11. Custom Lists ──────────────────────────────────────────────────────
	listsGroup := api.Group("/lists")
	listsGroup.Use(middleware.RequireAuth())
	listsGroup.Get("/", users.GetCustomLists)
	listsGroup.Post("/", users.CreateCustomList)
	listsGroup.Delete("/:id", users.DeleteCustomList)
	listsGroup.Post("/:id/members", users.AddListMember)
	listsGroup.Delete("/:id/members/:username", users.RemoveListMember)

	// ── 12. Media Upload ──────────────────────────────────────────────────────
	mediaGroup := api.Group("/media")
	mediaGroup.Use(middleware.RequireAuth())
	mediaGroup.Get("/cloudinary-signature", media.CloudinarySignature)

	// ── 13. ADMIN CONTROL ROOM (SECURED — RequireAdminAuth only) ──────────────
	// IMPORTANT: These routes use RequireAdminAuth which validates ADMIN JWT
	// (AdminJWTSecret, admin_staff table). Regular user JWTs are REJECTED here.
	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.RequireAdminAuth())
	adminGroup.Use(middleware.LogAdminAction())

	// Overview & Analytics
	adminGroup.Get("/overview/metrics", admin.GetOverviewMetrics)
	adminGroup.Get("/analytics/revenue", admin.GetRevenueAnalytics)
	adminGroup.Get("/analytics/growth", admin.GetUserGrowthStats)

	// User Management
	adminGroup.Get("/users", admin.GetUsers)
	adminGroup.Put("/users/:username/status", admin.UpdateUserStatus)
	adminGroup.Put("/users/:username/kyc", admin.UpdateKYC)
	adminGroup.Post("/users/:username/email", admin.SendSystemEmail)
	adminGroup.Post("/users/:username/force-logout", admin.ForceLogoutUser)
	adminGroup.Delete("/users/:username", middleware.RequireAdminRole("admin"), admin.DeleteUser)

	// Content Moderation
	adminGroup.Get("/posts", admin.GetFlaggedContent)
	adminGroup.Put("/posts/:id/decision", admin.ModeratePost)

	// Appeals
	adminGroup.Get("/appeals", admin.GetAppeals)
	adminGroup.Put("/appeals/:id/resolve", admin.UpdateAppeal)

	// Security
	adminGroup.Post("/security/mass-ban", middleware.RequireAdminRole("admin"), admin.MassBanBots)
	adminGroup.Get("/security/alerts", admin.GetSecurityAlerts)

	// Platform Settings (admin only)
	adminGroup.Get("/settings", admin.GetSettings)
	adminGroup.Put("/settings", middleware.RequireAdminRole("admin"), admin.UpdateSettings)

	// Platform State / Lockdown (admin only)
	adminGroup.Get("/platform/state", admin.GetPlatformState)
	adminGroup.Put("/platform/state", middleware.RequireAdminRole("admin"), admin.UpdatePlatformState)

	// Broadcast Email (admin only)
	adminGroup.Post("/broadcast/email", middleware.RequireAdminRole("admin"), admin.SendBroadcastEmail)

	// Audit Logs
	adminGroup.Get("/audit-logs", admin.GetAuditLogs)

	// Server Health & Storage Infrastructure Stats
	adminGroup.Get("/health", admin.GetServerHealth)
	adminGroup.Get("/storage/stats", admin.GetStorageStats)
	adminGroup.Get("/api-health", admin.GetApiHealth)
}
