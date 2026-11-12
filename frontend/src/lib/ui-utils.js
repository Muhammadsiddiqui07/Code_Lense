export function getFriendlyError(error, fallback = "Something went wrong. Please try again.") {
  const message = typeof error === "string" ? error : error?.message;
  const firstLine = message?.split(/\r?\n/)[0]?.trim();

  if (!firstLine) return fallback;
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}

export function getRepoDisplayName(repo) {
  if (repo?.name) return repo.name;

  try {
    const parts = new URL(repo?.url).pathname.split("/").filter(Boolean);
    return parts.slice(0, 2).join("/") || "GitHub repository";
  } catch {
    return "GitHub repository";
  }
}

export function isGitHubRepoUrl(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "github.com" &&
      parts.length === 2 &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
