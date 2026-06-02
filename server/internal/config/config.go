package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL            string
	Port                   string
	JWTSecret              string
	CloudinaryCloudName    string
	CloudinaryAPIKey       string
	CloudinaryAPISecret    string
	CloudinaryUploadFolder string
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
		port = "8080"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "felbic-super-secret-jwt-token-key-change-in-production-12345"
	}

	cloudinaryFolder := os.Getenv("CLOUDINARY_UPLOAD_FOLDER")
	if cloudinaryFolder == "" {
		cloudinaryFolder = "felbic/dev"
	}

	return &Config{
		DatabaseURL:            dbURL,
		Port:                   port,
		JWTSecret:              jwtSecret,
		CloudinaryCloudName:    os.Getenv("CLOUDINARY_CLOUD_NAME"),
		CloudinaryAPIKey:       os.Getenv("CLOUDINARY_API_KEY"),
		CloudinaryAPISecret:    os.Getenv("CLOUDINARY_API_SECRET"),
		CloudinaryUploadFolder: cloudinaryFolder,
	}
}
