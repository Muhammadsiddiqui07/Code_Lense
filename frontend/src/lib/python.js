import axios from "axios";

export const python = axios.create({
  baseURL: process.env.PYTHON_URL,
  timeout: 10 * 60 * 1000, // ingest lamba ho sakta hai
});