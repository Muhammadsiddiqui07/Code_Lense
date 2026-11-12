"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { askQuestion, getChat, getRepo } from "@/lib/api";
import { getFriendlyError, getRepoDisplayName } from "@/lib/ui-utils";
import { useRepos } from "@/components/RepoContext";
import ChatInput from "@/components/ChatInput";
import ChatMessage from "@/components/ChatMessage";
import RepoStatusBadge from "@/components/RepoStatusBadge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const starterQuestions = [
  "What is the tech stack?",
  "Where is authentication handled?",
  "Explain the folder structure",
];

export default function RepoChat({ repoId }) {
  const router = useRouter();
  const { repos, upsertRepo } = useRepos();
  const listedRepo = repos.find((item) => item._id === repoId);
  const [repo, setRepo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [retryQuestion, setRetryQuestion] = useState("");
  const messagesEndRef = useRef(null);
  const requestLockRef = useRef(false);
  const currentRepo = repo?._id === repoId ? repo : listedRepo;

  const loadChat = useCallback(async () => {
    setIsLoadingHistory(true);
    setLoadError("");
    setMessages([]);
    try {
      const [loadedRepo, history] = await Promise.all([getRepo(repoId), getChat(repoId)]);
      if (!Array.isArray(history)) {
        throw new Error("Chat history could not be loaded.");
      }
      setRepo(loadedRepo);
      upsertRepo(loadedRepo);
      setMessages(
        history.map((message, index) => ({
          ...message,
          id: `history-${index}`,
          sources: message.sources || [],
        })),
      );
    } catch (error) {
      setLoadError(getFriendlyError(error, "We couldn't load this conversation."));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [repoId, upsertRepo]);

  useEffect(() => {
    const timer = window.setTimeout(loadChat, 0);
    return () => window.clearTimeout(timer);
  }, [loadChat]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    // Scrolling after render keeps the newest reply visible without jumping before it exists.
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: messages.length > 1 || isAsking ? "smooth" : "auto",
        block: "end",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, isAsking]);

  async function requestAnswer(question, addUserMessage = true) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || requestLockRef.current || loadError) return;
    requestLockRef.current = true;
    setAskError("");
    setIsAsking(true);
    setRetryQuestion(trimmedQuestion);

    if (addUserMessage) {
      // Showing the question immediately makes the chat feel responsive while RAG runs.
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: "user", content: trimmedQuestion },
      ]);
    }

    try {
      const response = await askQuestion(repoId, trimmedQuestion);
      if (!response || typeof response.answer !== "string") {
        throw new Error("The assistant couldn't return an answer. Please try again.");
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          sources: response.sources || [],
        },
      ]);
      setRetryQuestion("");
    } catch (error) {
      setAskError(getFriendlyError(error, "We couldn't get an answer. Please try again."));
    } finally {
      requestLockRef.current = false;
      setIsAsking(false);
    }
  }

  const repoName = currentRepo ? getRepoDisplayName(currentRepo) : "Repository chat";
  const canChat =
    currentRepo?.status === "ready" && !isLoadingHistory && !loadError && !isAsking;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-zinc-800/80 px-4 sm:px-7">
        <Link
          href="/"
          aria-label="Back to repositories"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-zinc-100">{repoName}</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {currentRepo?.url || "Ask questions grounded in repository code"}
          </p>
        </div>
        {currentRepo && (
          <RepoStatusBadge status={currentRepo.status} error={currentRepo.error} />
        )}
      </header>

      <section className="flex min-h-0 flex-1 flex-col" aria-label="Repository conversation">
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
            {isLoadingHistory && messages.length === 0 && (
              <div className="space-y-5" aria-label="Loading conversation">
                <div className="skeleton-shimmer h-20 w-4/5 rounded-2xl" />
                <div className="ml-auto skeleton-shimmer h-14 w-3/5 rounded-2xl" />
              </div>
            )}

            {loadError && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{loadError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadChat}
                  className="gap-2 border-red-900 text-red-100 hover:bg-red-900/40 hover:text-white"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            )}

            {!isLoadingHistory && !loadError && currentRepo?.status === "ingesting" && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-100"
              >
                <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-amber-300" />
                <span>This repository is still being indexed. Chat will be available when it&apos;s ready.</span>
              </div>
            )}

            {!isLoadingHistory && !loadError && currentRepo?.status === "failed" && (
              <div
                role="alert"
                className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200"
              >
                <p>We couldn&apos;t index this repository.</p>
                {currentRepo.error && (
                  <p className="mt-1 text-xs text-red-300/80">
                    {getFriendlyError(currentRepo.error)}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/")}
                  className="mt-3 border-red-900 text-red-100 hover:bg-red-900/40 hover:text-white"
                >
                  Add another repository
                </Button>
              </div>
            )}

            {!isLoadingHistory && !loadError && messages.length === 0 && currentRepo?.status === "ready" && (
              <div className="mx-auto flex w-full max-w-2xl flex-col items-center py-14 text-center sm:py-20">
                <div className="grid size-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <Bot className="size-6" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-zinc-100">
                  Let&apos;s explore {repoName}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Ask a question about the architecture, a specific feature, or how the pieces fit together.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  {starterQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      disabled={!canChat}
                      onClick={() => requestAnswer(question)}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:border-emerald-500/40 hover:bg-zinc-900 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles className="size-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isAsking && (
              <div
                role="status"
                aria-label="Assistant is thinking"
                className="animate-message-in flex items-center gap-3"
              >
                <div className="grid size-8 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <Bot className="size-4" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:300ms]" />
                  <span className="sr-only">Thinking</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/90 px-4 pb-4 pt-3 sm:px-8 sm:pb-6">
          <div className="mx-auto max-w-4xl">
            {askError && (
              <div
                role="alert"
                className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200"
              >
                <span>{askError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isAsking || !retryQuestion}
                  onClick={() => requestAnswer(retryQuestion, false)}
                  className="gap-2 text-red-100 hover:bg-red-900/40 hover:text-white"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Retry answer
                </Button>
              </div>
            )}
            {currentRepo?.status === "ready" && !loadError ? (
              <ChatInput
                onSubmit={(question) => requestAnswer(question)}
                disabled={!canChat}
              />
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center text-xs text-zinc-500">
                {currentRepo?.status === "ingesting"
                  ? "The chat input will be available when indexing is complete."
                  : currentRepo?.status === "failed"
                    ? "This repository could not be indexed."
                    : "Loading repository chat..."}
              </div>
            )}
            <p className="mt-2 text-center text-[10px] text-zinc-600">
              Answers are generated from indexed repository content.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
