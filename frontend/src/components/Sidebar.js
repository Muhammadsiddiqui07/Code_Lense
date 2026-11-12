"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodeXml, Plus } from "lucide-react";
import { useRepos } from "@/components/RepoContext";
import RepoList from "@/components/RepoList";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Sidebar({ onNavigate }) {
  const router = useRouter();
  const { repos } = useRepos();

  function openAddRepository() {
    onNavigate?.();
    router.push("/");
  }

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950 px-3 py-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
          <CodeXml className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight text-zinc-100">
            CodeLens
          </span>
          <span className="block text-xs text-zinc-500">Repository intelligence</span>
        </span>
      </Link>

      <Button
        className="h-10 w-full justify-start gap-2 rounded-xl bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
        onClick={openAddRepository}
      >
        <Plus className="size-4" aria-hidden="true" />
        Add repository
      </Button>

      <div className="mb-2 mt-7 flex items-center justify-between px-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Your repositories
        </h2>
        <span className="text-xs tabular-nums text-zinc-600">{repos.length}</span>
      </div>
      <Separator className="mb-2 bg-zinc-800" />
      <RepoList repos={repos} onNavigate={onNavigate} />

      <div className="mt-auto border-t border-zinc-800/80 px-2 pt-4 text-xs leading-relaxed text-zinc-600">
        Ask questions. Find answers in code.
      </div>
    </div>
  );
}
