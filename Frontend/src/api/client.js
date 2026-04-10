import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ─── Auth Interceptor: attach token to every request ───
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// ─── Auth response interceptor: redirect to login on 401 ───
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect if we're already on the login page
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ─── Authentication ───

export async function loginUser(username, password) {
  const res = await client.post("/auth/login", { username, password });
  return res.data;
}

export async function logoutUser() {
  const res = await client.post("/auth/logout");
  return res.data;
}

export async function getCurrentUser() {
  const res = await client.get("/auth/me");
  return res.data;
}

// ─── Ingestion ───

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await client.post("/ingestion/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getDatasetStatus(datasetId) {
  const res = await client.get(`/ingestion/${datasetId}/status`);
  return res.data;
}

// ─── Reviews ───

export async function getReviewQueue(page = 1, status = "PENDING") {
  const res = await client.get("/reviews/queue", {
    params: { page, status },
  });
  return res.data;
}

export async function claimReview(reviewId) {
  const res = await client.post(`/reviews/${reviewId}/claim`);
  return res.data;
}

export async function getReviewDetail(reviewId) {
  const res = await client.get(`/reviews/${reviewId}/detail`);
  return res.data;
}

export async function submitFeedback(reviewId, data) {
  const res = await client.post(`/reviews/${reviewId}/submit`, data);
  return res.data;
}

// ─── Risk Classification ───

export async function getClassifiedTransactions(params = {}) {
  const res = await client.get("/transactions/classified", { params });
  return res.data;
}

// ─── Settings ───

export async function getThresholds() {
  const res = await client.get("/settings/thresholds");
  return res.data;
}

export async function getRules() {
  const res = await client.get("/settings/rules");
  return res.data;
}

export async function getAuditLogs(page = 1) {
  const res = await client.get("/settings/audit-logs", {
    params: { page },
  });
  return res.data;
}

// ─── Analytics ───

export async function getAnalyticsDashboard() {
  const res = await client.get("/analytics/dashboard");
  return res.data;
}
