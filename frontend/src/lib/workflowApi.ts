import axios from "axios";

const WORKFLOW_TOKEN_KEY = "workflow_token";

const workflowApi = axios.create({
  baseURL: import.meta.env.VITE_WORKFLOW_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request automatically
workflowApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(WORKFLOW_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Token helpers ---
export const setWorkflowToken = (token: string) => {
  localStorage.setItem(WORKFLOW_TOKEN_KEY, token);
};

export const getWorkflowToken = (): string | null => {
  return localStorage.getItem(WORKFLOW_TOKEN_KEY);
};

export const removeWorkflowToken = () => {
  localStorage.removeItem(WORKFLOW_TOKEN_KEY);
};

/** Decode the JWT payload without verification (client-side only). */
export const decodeToken = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export default workflowApi;
