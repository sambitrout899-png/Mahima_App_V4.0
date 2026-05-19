import axios from "axios";
import { API_BASE } from "../api";
import { getToken } from "../utils/auth";

const instance = axios.create({
  baseURL: API_BASE || "/api",
});

instance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
