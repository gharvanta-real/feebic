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

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResponse> {
  const signature = await apiClient.get<CloudinarySignature>("/media/cloudinary-signature");
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", signature.api_key);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloud_name}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let message = "Cloudinary upload failed";
    try {
      const data = await response.json();
      message = data?.error?.message || message;
    } catch {
      // Keep the generic upload error.
    }
    throw new Error(message);
  }

  return response.json() as Promise<CloudinaryUploadResponse>;
}
