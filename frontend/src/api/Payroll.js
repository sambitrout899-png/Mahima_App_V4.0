// src/apiClient.js
import axios from "axios";

export const api = axios.create({
  baseURL: "",     // let Vite proxy to /api
  withCredentials: true
});
