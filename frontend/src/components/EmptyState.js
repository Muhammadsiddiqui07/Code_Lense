"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, GitBranch, LoaderCircle, Sparkles } from "lucide-react";
import { addRepo } from "@/lib/api";
import { getFriendlyError, getRepoDisplayName, isGitHubRepoUrl } from "@/lib/ui-utils";
import { useRepos } from "@/components/RepoContext";
import RepoStatusBadge from "@/components/RepoStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const examples = [
  { name: "Next.js", url: "https://github.com/vercel/next.js" },
  { name: "React", url: "https://github.com/facebook/react" },
  { name: "Tailwind CSS", url: "https://github.com/tailwindlabs/tailwindcss" },
];

export default function EmptyState() {
  const router = useRouter();
  const { repos, upsertRepo } = useRepos();
  const [repoUrl, setRepoUrl] = useState("");
  const [activeRepoId, setActiveRepoId] = useState("");
  const [validationError, setValidationError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const activeRepo =
    repos.find((repo) => repo._id === activeRepoId) ||
    repos.find((repo) => repo.status === "ingesting");

  async function submitRepository(url) {
    const trimmedUrl = url.trim();
    if (!isGitHubRepoUrl(trimmedUrl)) {
      setValidationError("Enter a public GitHub URL like https://github.com/user/repo.");
      return;
    }

    setValidationError("");
    setRequestError("");
    setIsAdding(true);
    try {
      const repo = await addRepo(trimmedUrl);
      upsertRepo(repo);
      setActiveRepoId(repo._id);
      setRepoUrl("");
    } catch (error) {
      setRequestError(getFriendlyError(error, "We couldn't add that repository."));
    } finally {
      setIsAdding(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitRepository(repoUrl);
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-5 py-10 sm:px-8">
      <main className="w-full max-w-3xl">
        <div className="mb-9 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-400">
            <Sparkles className="size-3.5 text-emerald-300" aria-hidden="true" />
            Your AI pair programmer for any codebase
          </div>
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Understand any codebase.
            <span className="mt-1 block text-zinc-500">Just ask.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-6 text-zinc-400 sm:text-base">
            Add a public GitHub repository. Once it&apos;s indexed, chat with its code and get
            answers grounded in real files.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-9 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2 shadow-2xl shadow-black/20 sm:flex sm:items-center sm:gap-2 sm:p-2.5"
          noValidate
        >
          <label htmlFor="repository-url" className="sr-only">
            Public GitHub repository URL
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <GitBranch className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <Input
              id="repository-url"
              type="url"
              value={repoUrl}
              onChange={(event) => {
                setRepoUrl(event.target.value);
                setValidationError("");
                setRequestError("");
              }}
              placeholder="https://github.com/user/repo"
              autoComplete="url"
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? "repository-url-error" : "repository-url-hint"}
              className="h-11 border-0 bg-transparent px-1 text-sm shadow-none placeholder:text-zinc-600 focus-visible:border-0 focus-visible:ring-0 md:text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={isAdding}
            className="mt-2 h-11 w-full shrink-0 gap-2 rounded-xl bg-emerald-400 px-5 font-semibold text-zinc-950 hover:bg-emerald-300 sm:mt-0 sm:w-auto"
          >
            {isAdding ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Adding
              </>
            ) : (
              <>
                Add repository
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>

        <div className="mx-auto mt-3 max-w-2xl px-1 text-left">
          {validationError ? (
            <p id="repository-url-error" className="text-xs text-red-300" role="alert">
              {validationError}
            </p>
          ) : requestError ? (
            <p className="text-xs text-red-300" role="alert">
              {requestError}
            </p>
          ) : (
            <p id="repository-url-hint" className="text-xs text-zinc-600">
              Public repositories only. Use the repository&apos;s HTTPS URL.
            </p>
          )}
        </div>

        {activeRepo && (
          <section
            aria-live="polite"
            className="mx-auto mt-7 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Repository</p>
                <p className="mt-1 truncate text-sm font-medium text-zinc-100">
                  {getRepoDisplayName(activeRepo)}
                </p>
              </div>
              <RepoStatusBadge status={activeRepo.status} error={activeRepo.error} />
            </div>

            {activeRepo.status === "ingesting" && (
              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm text-amber-100">
                  <LoaderCircle className="size-4 animate-spin text-amber-300" aria-hidden="true" />
                  Indexing your repository
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  We&apos;re mapping files and preparing code context. This usually takes a moment.
                </p>
                <div className="mt-4 space-y-2" aria-label="Indexing progress">
                  <div className="skeleton-shimmer h-2 w-full rounded-full" />
                  <div className="skeleton-shimmer h-2 w-3/4 rounded-full" />
                </div>
                {Number.isFinite(activeRepo.chunks) && activeRepo.chunks > 0 && (
                  <p className="mt-3 text-xs text-zinc-500">
                    {activeRepo.chunks.toLocaleString()} code chunks indexed so far
                  </p>
                )}
              </div>
            )}

            {activeRepo.status === "ready" && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <p className="flex items-center gap-2 text-sm text-emerald-200">
                  <Check className="size-4" aria-hidden="true" />
                  Repository indexed and ready to explore
                </p>
                <Button
                  onClick={() => router.push(`/repo/${encodeURIComponent(activeRepo._id)}`)}
                  className="gap-2 rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                >
                  Start chatting
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {activeRepo.status === "failed" && (
              <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
                We couldn&apos;t index this repository.{" "}
                {activeRepo.error ? getFriendlyError(activeRepo.error) : "Please check the URL and try again."}
              </div>
            )}
          </section>
        )}

        <div className="mx-auto mt-9 max-w-2xl">
          <p className="mb-3 text-center text-xs font-medium text-zinc-500">
            Try an example repository
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {examples.map((example) => (
              <button
                key={example.url}
                type="button"
                onClick={() => {
                  setRepoUrl(example.url);
                  setValidationError("");
                  setRequestError("");
                }}
                className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
