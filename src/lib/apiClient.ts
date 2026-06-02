// API Client Wrapper to connect Next.js to the Go Fiber Monolith backend
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8081/api"
).replace(/\/$/, "");

type RequestOptions = {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function apiRequest<T = any>(endpoint: string, options: RequestOptions): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Automatically attach authorization token if present in localStorage
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ch_token");
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

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch {
    throw new Error(`Unable to reach Felbic API at ${API_BASE_URL}. Start the Supabase-backed API server and retry.`);
  }

  if (!response.ok) {
    let errorMessage = "An error occurred during the API request";
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch (_) {
      // Fallback if response is not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
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
