// src/apiClient.js
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",     // let Vite proxy to http://localhost:5001
  withCredentials: true
});
