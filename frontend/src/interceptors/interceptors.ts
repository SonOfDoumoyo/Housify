import { api } from "./api";
import type { InternalAxiosRequestConfig } from "axios";
import axios from "axios";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean; skipAuth?: boolean };
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

const processQueue = (error?: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const originalRequest = error.config as RetryConfig | undefined;
    const url = originalRequest?.url ?? "";
    // The backend reports an expired token as 401 (missing/blocked token)
    // or 406 (ExpiredToken / RefreshTokenExpired). Both mean the same
    // thing: try the refresh token once. Without the 406 case, a user
    // whose access token expired was logged out the next time any page
    // (e.g. Browse Homes) re-checked the session, even though a valid
    // 7-day refresh token was sitting in the cookie jar.
    const status = error.response?.status;
    if ((status !== 401 && status !== 406) || !originalRequest || originalRequest._retry || originalRequest.skipAuth ||
        /\/auth\/(signin|signup|logout|refresh_access|reset_password|password_reset)/.test(url)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then(() => api(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;
    try {
      await api.post("/auth/refresh_access", {}, { withCredentials: true });
      processQueue();
      return await api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
