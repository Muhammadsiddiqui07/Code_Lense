"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, RefreshCw } from "lucide-react";
import { getRepo, listRepos } from "@/lib/api";
import { RepoContext } from "@/components/RepoContext";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function AppShell({ children }) {
  const [repos, setRepos] = useState([]);
  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reposRef = useRef(repos);

  useEffect(() => {
    reposRef.current = repos;
  }, [repos]);

  const refreshRepos = useCallback(async () => {
    try {
      const nextRepos = await listRepos();
      if (!Array.isArray(nextRepos)) {
        throw new Error("The repository list could not be loaded.");
      }
      setRepos((current) => {
        const listedIds = new Set(nextRepos.map((repo) => repo._id));
        return [
          ...nextRepos,
          ...current.filter((repo) => !listedIds.has(repo._id)),
        ];
      });
      setNotice("");
      return true;
    } catch {
      setNotice("We couldn't load your repositories. Check your connection and try again.");
      return false;
    }
  }, []);

  const upsertRepo = useCallback((repo) => {
    if (!repo?._id) return;
    setRepos((current) => {
      const index = current.findIndex((item) => item._id === repo._id);
      if (index === -1) return [repo, ...current];
      return current.map((item) => (item._id === repo._id ? repo : item));
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refreshRepos, 0);
    return () => window.clearTimeout(timer);
  }, [refreshRepos]);

  const hasIngestingRepo = repos.some((repo) => repo.status === "ingesting");

  useEffect(() => {
    if (!hasIngestingRepo) return undefined;
    let active = true;

    // Keep polling on a steady 3-second interval while any repo is ingesting.
    const poll = async () => {
      const ingesting = reposRef.current.filter((repo) => repo.status === "ingesting");
      const results = await Promise.all(
        ingesting.map(async (repo) => {
          try {
            return { repo: await getRepo(repo._id) };
          } catch {
            return { error: true };
          }
        }),
      );

      if (!active) return;
      results.forEach((result) => {
        if (result.repo) upsertRepo(result.repo);
      });
      setNotice(
        results.some((result) => result.error)
          ? "We couldn't refresh indexing status. We'll keep trying."
          : "",
      );
    };

    const timer = window.setInterval(poll, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [hasIngestingRepo, upsertRepo]);

  const contextValue = useMemo(
    () => ({ repos, upsertRepo, refreshRepos }),
    [repos, upsertRepo, refreshRepos],
  );

  return (
    <RepoContext.Provider value={contextValue}>
      <div className="flex h-dvh min-h-0 overflow-hidden bg-zinc-950 text-zinc-100">
        <aside className="hidden h-full w-[276px] shrink-0 border-r border-zinc-800/80 md:flex">
          <Sidebar />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800/80 px-4 md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open repository navigation"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Repository navigation</SheetTitle>
                </SheetHeader>
                <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold tracking-tight">CodeLens</span>
          </header>

          {notice && (
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-900/50 bg-amber-950/40 px-4 py-2.5 text-sm text-amber-200"
              role="alert"
            >
              <span>{notice}</span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-amber-100 hover:bg-amber-900/40 hover:text-white"
                onClick={refreshRepos}
              >
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            </div>
          )}

          <div className="min-h-0 flex-1">{children}</div>
        </main>
      </div>
    </RepoContext.Provider>
  );
}
