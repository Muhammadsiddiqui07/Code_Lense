"use client";

import { createContext, useContext } from "react";

export const RepoContext = createContext(null);

export function useRepos() {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error("useRepos must be used inside the repository provider.");
  }
  return context;
}
