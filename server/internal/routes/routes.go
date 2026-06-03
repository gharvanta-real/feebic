package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

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
	"server/internal/admin"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// 1. Authentication Group (Public)
	authGroup := api.Group("/auth")
	authGroup.Post("/register/start", auth.StartRegistration)
	authGroup.Post("/register/verify", auth.VerifyRegistration)
	authGroup.Post("/register", auth.RegisterDisabled)
	authGroup.Post("/login", auth.Login)
	authGroup.Post("/password/reset/start", auth.StartPasswordReset)
	authGroup.Post("/password/reset/verify", auth.VerifyPasswordReset)
	authGroup.Get("/username/:username", auth.CheckUsername)

	// 2. Users & Profiles Group
	usersGroup := api.Group("/users")

	// Protected Profile endpoints
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

	// Public Creator Directory endpoints
	usersGroup.Get("/creators", users.ListCreators)
	usersGroup.Get("/creator/:username", users.GetCreatorByUsername)

	// 3. Posts & Feed Group
	postsGroup := api.Group("/posts")
	postsGroup.Get("/", posts.GetFeed) // Public feed (optionally authorized inside handler)
	postsGroup.Get("/bookmarks", middleware.RequireAuth(), posts.GetBookmarks)
	postsGroup.Get("/mine", middleware.RequireAuth(), posts.GetMyPosts)
	postsGroup.Post("/", middleware.RequireAuth(), posts.CreatePost) // Protected post creation
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

	// 4. Wallet & Transaction Group (Protected)
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

	// 5. Notifications Group (Protected)
	notifGroup := api.Group("/notifications")
	notifGroup.Use(middleware.RequireAuth())
	notifGroup.Get("/", notifications.GetNotifications)
	notifGroup.Post("/read", notifications.MarkRead)

	// 6. Vault Assets Group (Protected)
	vaultGroup := api.Group("/vault")
	vaultGroup.Use(middleware.RequireAuth())
	vaultGroup.Get("/", vault.GetVault)
	vaultGroup.Post("/", vault.AddToVault)
	vaultGroup.Delete("/:id", vault.DeleteFromVault)

	// 7. Ephemeral Stories Group (Protected)
	storiesGroup := api.Group("/stories")
	storiesGroup.Get("/", stories.GetActiveStories)
	storiesGroup.Use(middleware.RequireAuth())
	storiesGroup.Post("/", stories.CreateStory)
	storiesGroup.Post("/:id/view", stories.MarkStoryViewed)

	// 8. Direct Messages / Chat Group (Protected)
	chatGroup := api.Group("/chat")

	// WebSocket connection route (handles upgrade authentication in custom middleware)
	chatGroup.Get("/ws", chat.WebSocketUpgradeMiddleware, websocket.New(chat.WebSocketHandler))

	chatGroup.Use(middleware.RequireAuth())
	chatGroup.Get("/conversations", chat.GetConversations)
	chatGroup.Get("/messages/:username", chat.GetMessages)
	chatGroup.Post("/messages", chat.SendMessage)
	chatGroup.Post("/broadcast", chat.BroadcastMessage)

	// Live Streaming Group
	liveGroup := api.Group("/live")
	liveGroup.Get("/active", live.GetActiveStream)
	liveGroup.Use(middleware.RequireAuth())
	liveGroup.Post("/start", live.StartStream)
	liveGroup.Post("/:id/end", live.EndStream)
	liveGroup.Post("/:id/comments", live.AddComment)
	liveGroup.Post("/:id/reactions", live.AddReaction)

	// Custom Lists Group (Protected)
	listsGroup := api.Group("/lists")
	listsGroup.Use(middleware.RequireAuth())
	listsGroup.Get("/", users.GetCustomLists)
	listsGroup.Post("/", users.CreateCustomList)
	listsGroup.Delete("/:id", users.DeleteCustomList)
	listsGroup.Post("/:id/members", users.AddListMember)
	listsGroup.Delete("/:id/members/:username", users.RemoveListMember)

	// 9. Media Upload Helpers
	mediaGroup := api.Group("/media")
	mediaGroup.Use(middleware.RequireAuth())
	mediaGroup.Get("/cloudinary-signature", media.CloudinarySignature)

	// 10. Admin Control Room Endpoints
	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.RequireAuth())
	adminGroup.Get("/overview/metrics", admin.GetOverviewMetrics)
	adminGroup.Get("/users", admin.GetUsers)
	adminGroup.Put("/users/:username/status", admin.UpdateUserStatus)
	adminGroup.Put("/users/:username/kyc", admin.UpdateKYC)
	adminGroup.Post("/users/:username/email", admin.SendSystemEmail)
	adminGroup.Delete("/users/:username", admin.DeleteUser)
	adminGroup.Get("/posts", admin.GetFlaggedContent)
	adminGroup.Put("/posts/:id/decision", admin.ModeratePost)
	adminGroup.Get("/appeals", admin.GetAppeals)
	adminGroup.Put("/appeals/:id/resolve", admin.UpdateAppeal)
	adminGroup.Post("/security/mass-ban", admin.MassBanBots)
	adminGroup.Get("/security/alerts", admin.GetSecurityAlerts)
	adminGroup.Get("/settings", admin.GetSettings)
	adminGroup.Put("/settings", admin.UpdateSettings)
}
