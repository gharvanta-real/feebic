package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL            string
	Port                   string
	JWTSecret              string
	AdminJWTSecret         string
	AdminPasswordKey       string
	CloudinaryCloudName    string
	CloudinaryAPIKey       string
	CloudinaryAPISecret    string
	CloudinaryUploadFolder string
	ResendAPIKey           string
	ResendFromEmail        string
}

func Load() *Config {
	// Attempt to load .env file, but do not crash if not present (useful in containerized production)
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️ No .env file found, reading parameters directly from environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/felbic?sslmode=disable"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "felbic-super-secret-jwt-token-key-change-in-production-12345"
	}
	if strings.EqualFold(os.Getenv("APP_ENV"), "production") && strings.Contains(jwtSecret, "change-in-production") {
		log.Fatal("JWT_SECRET must be set to a strong production secret")
	}

	adminJWTSecret := os.Getenv("ADMIN_JWT_SECRET")
	if adminJWTSecret == "" {
		adminJWTSecret = "felbic-admin-secret-key-completely-separate-from-users-abc987"
	}

	adminPasswordKey := os.Getenv("ADMIN_PASSWORD_KEY")
	if adminPasswordKey == "" {
		adminPasswordKey = "felbic-admin-password-pepper-key-change-in-production"
	}

	cloudinaryFolder := os.Getenv("CLOUDINARY_UPLOAD_FOLDER")
	if cloudinaryFolder == "" {
		cloudinaryFolder = "felbic/dev"
	}

	resendFrom := os.Getenv("RESEND_FROM_EMAIL")
	if resendFrom == "" {
		resendFrom = "Felbic <onboarding@resend.dev>"
	}

	return &Config{
		DatabaseURL:            dbURL,
		Port:                   port,
		JWTSecret:              jwtSecret,
		AdminJWTSecret:         adminJWTSecret,
		AdminPasswordKey:       adminPasswordKey,
		CloudinaryCloudName:    os.Getenv("CLOUDINARY_CLOUD_NAME"),
		CloudinaryAPIKey:       os.Getenv("CLOUDINARY_API_KEY"),
		CloudinaryAPISecret:    os.Getenv("CLOUDINARY_API_SECRET"),
		CloudinaryUploadFolder: cloudinaryFolder,
		ResendAPIKey:           os.Getenv("RESEND_API_KEY"),
		ResendFromEmail:        resendFrom,
	}
}
