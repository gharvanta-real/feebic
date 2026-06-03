// API Client Wrapper to connect Next.js to the Go Fiber Monolith backend.
// Supports a comma-separated priority list so local dev can fall back to the deployed API.
const configuredApiUrls = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8081/api,https://api.felbic.gharvanta.in/api";

export const API_BASE_URLS = configuredApiUrls
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const API_BASE_URL = API_BASE_URLS[0] || "http://127.0.0.1:8081/api";

type RequestOptions = {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function apiRequest<T = any>(endpoint: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Automatically attach authorization token if present in localStorage
  if (typeof window !== "undefined") {
    const isAdminPath = window.location.pathname.startsWith("/admin");
    const token = localStorage.getItem(isAdminPath ? "ch_admin_token" : "ch_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let lastErrorMessage = "";

  for (const baseUrl of API_BASE_URLS) {
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      response = await fetch(`${baseUrl}${endpoint}`, { ...fetchOptions, signal: controller.signal });
    } catch {
      lastErrorMessage = `Unable to reach Felbic API at ${baseUrl}`;
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      let errorMessage = "An error occurred during the API request";
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // Fallback if response is not JSON.
      }

      lastErrorMessage = `${baseUrl}: ${errorMessage}`;
      if (response.status >= 500) {
        continue;
      }
      throw new ApiError(errorMessage, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  throw new Error(`${lastErrorMessage || "Unable to reach Felbic API"}. Tried: ${API_BASE_URLS.join(", ")}`);
}

export const apiClient = {
  get: <T = any>(endpoint: string, headers?: Record<string, string>) => 
    apiRequest<T>(endpoint, { method: "GET", headers }),
    
  post: <T = any>(endpoint: string, body?: unknown, headers?: Record<string, string>) => 
    apiRequest<T>(endpoint, { method: "POST", body, headers }),
    
  put: <T = any>(endpoint: string, body?: unknown, headers?: Record<string, string>) => 
    apiRequest<T>(endpoint, { method: "PUT", body, headers }),

  delete: <T = any>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: "DELETE", body, headers }),
};
