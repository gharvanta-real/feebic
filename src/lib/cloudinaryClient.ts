import { apiClient } from "@/lib/apiClient";

type CloudinarySignature = {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  signature: string;
};

type CloudinaryUploadResponse = {
  secure_url: string;
  resource_type: "image" | "video" | "raw";
  original_filename?: string;
  bytes?: number;
};

export async function uploadToCloudinary(
  file: File,
  username?: string,
  type?: "profiles" | "posts" | "vault" | "chats"
): Promise<CloudinaryUploadResponse> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  
  let endpoint = "/media/cloudinary-signature";
  const queryParams: string[] = [];
  if (username) queryParams.push(`username=${encodeURIComponent(username)}`);
  if (type) queryParams.push(`type=${encodeURIComponent(type)}`);
  if (queryParams.length > 0) {
    endpoint += `?${queryParams.join("&")}`;
  }
  const signature = await apiClient.get<CloudinarySignature>(endpoint);

  if (!signature || !signature.api_key) {
    throw new Error("Cloudinary upload is not configured on the API server.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.api_key);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloud_name}/${resourceType}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Cloudinary upload failed.");
    }

    return await response.json() as CloudinaryUploadResponse;
  } catch (err) {
    throw err instanceof Error ? err : new Error("Cloudinary upload failed.");
  }
}

export type VideoMetadata = {
  duration: number; // in seconds
  width: number;
  height: number;
};

export function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    // Return mock metadata in non-browser environments if any, but since this is client-side code:
    if (typeof window === "undefined" || !window.document) {
      return resolve({ duration: 10, width: 1080, height: 1920 });
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata. The file may be corrupt."));
    };
  });
}

export type ValidationResult = {
  isValid: boolean;
  error?: string;
};

export async function validateVideoFile(
  file: File,
  options?: {
    maxDurationSeconds?: number;
    maxSizeBytes?: number;
  }
): Promise<ValidationResult> {
  const maxDuration = options?.maxDurationSeconds ?? 600; // Default 10 minutes (600s)
  const maxSize = options?.maxSizeBytes ?? 100 * 1024 * 1024; // Default 100 MB

  // 1. Basic Type Check
  if (!file.type.startsWith("video/")) {
    return { isValid: false, error: "Selected file is not a valid video." };
  }

  // 2. File Size Check
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `Video file is too large (${sizeMB} MB). Maximum allowed size is ${limitMB} MB.`,
    };
  }

  // 3. Duration Check
  try {
    const meta = await getVideoMetadata(file);
    if (meta.duration > maxDuration) {
      const durationMin = (meta.duration / 60).toFixed(1);
      const limitMin = (maxDuration / 60).toFixed(0);
      
      let errorMsg = `Video is too long (${durationMin} mins). Maximum allowed duration is ${limitMin} mins.`;
      if (maxDuration < 60) {
        errorMsg = `Video is too long (${meta.duration.toFixed(0)}s). Maximum allowed duration is ${maxDuration} seconds.`;
      }
      return {
        isValid: false,
        error: errorMsg,
      };
    }
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : "Invalid video file.",
    };
  }

  return { isValid: true };
}

