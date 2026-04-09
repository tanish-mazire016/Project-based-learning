import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

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
