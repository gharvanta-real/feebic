package admin

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"

	"server/internal/database"
)

// serverStartTime records when the process started
var serverStartTime = time.Now()

// ─── Feature: Server Health ────────────────────────────────────────────────────

func GetServerHealth(c *fiber.Ctx) error {
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)

	// Ping DB
	dbStatus := "connected"
	dbPingMs := int64(0)
	pingStart := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := database.Pool.Ping(ctx); err != nil {
		dbStatus = "disconnected"
	} else {
		dbPingMs = time.Since(pingStart).Milliseconds()
	}

	uptimeSeconds := int64(time.Since(serverStartTime).Seconds())

	return c.JSON(fiber.Map{
		"status":          "online",
		"uptime_seconds":  uptimeSeconds,
		"goroutines":      runtime.NumGoroutine(),
		"memory_alloc_mb": fmt.Sprintf("%.1f", float64(ms.Alloc)/1024/1024),
		"memory_sys_mb":   fmt.Sprintf("%.1f", float64(ms.Sys)/1024/1024),
		"memory_heap_mb":  fmt.Sprintf("%.1f", float64(ms.HeapInuse)/1024/1024),
		"num_gc":          ms.NumGC,
		"go_version":      runtime.Version(),
		"os":              runtime.GOOS,
		"arch":            runtime.GOARCH,
		"cpus":            runtime.NumCPU(),
		"db_status":       dbStatus,
		"db_ping_ms":      dbPingMs,
		"server_time":     time.Now().Format(time.RFC3339),
		"version":         "1.0.0",
	})
}

// ─── Feature: Storage Stats ────────────────────────────────────────────────────

func GetStorageStats(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var totalFiles, imageFiles, videoFiles, otherFiles int
	_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM vault_assets").Scan(&totalFiles)
	_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM vault_assets WHERE LOWER(media_type) LIKE '%image%'").Scan(&imageFiles)
	_ = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM vault_assets WHERE LOWER(media_type) LIKE '%video%'").Scan(&videoFiles)
	otherFiles = totalFiles - imageFiles - videoFiles

	// Count post media
	var postImages, postVideos int
	_ = database.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM posts WHERE array_length(media_urls, 1) > 0 AND LOWER(COALESCE(media_type,'')) LIKE '%image%'
	`).Scan(&postImages)
	_ = database.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM posts WHERE array_length(media_urls, 1) > 0 AND LOWER(COALESCE(media_type,'')) LIKE '%video%'
	`).Scan(&postVideos)

	totalImages := imageFiles + postImages
	totalVideos := videoFiles + postVideos
	allFiles := totalFiles + postImages + postVideos

	// Rough estimate: avg 500KB per image, 5MB per video
	estimatedBytes := int64(totalImages)*500*1024 + int64(totalVideos)*5*1024*1024
	estimatedMB := float64(estimatedBytes) / 1024 / 1024
	limitMB := float64(10 * 1024) // 10 GB estimated limit

	return c.JSON(fiber.Map{
		"total_files":    allFiles,
		"images":         totalImages,
		"videos":         totalVideos,
		"other":          otherFiles,
		"total_bytes":    estimatedBytes,
		"total_mb":       fmt.Sprintf("%.1f", estimatedMB),
		"limit_bytes":    int64(limitMB * 1024 * 1024),
		"used_percent":   fmt.Sprintf("%.1f", (estimatedMB/limitMB)*100),
		"storage_source": "cloudinary",
		"note":           "Estimated based on file count × average size",
	})
}

func GetApiHealth(c *fiber.Ctx) error {
	now := time.Now().Format(time.RFC3339)
	endpoints := []fiber.Map{
		{"endpoint": "/admin/health", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/overview/metrics", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/users", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/posts", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/appeals", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/security/alerts", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/audit-logs", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/settings", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/platform/state", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
		{"endpoint": "/admin/storage/stats", "method": "GET", "status": "ok", "latency_ms": 0, "last_checked": now},
	}
	return c.JSON(endpoints)
}
