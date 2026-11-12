import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch } from "lucide-react";
import { getRepoDisplayName } from "@/lib/ui-utils";
import RepoStatusBadge from "@/components/RepoStatusBadge";

export default function RepoList({ repos, onNavigate }) {
  const pathname = usePathname();

  if (!repos.length) {
    return (
      <p className="px-2 py-4 text-xs leading-relaxed text-zinc-500">
        Your repositories will show up here after you add one.
      </p>
    );
  }

  return (
    <nav aria-label="Repositories" className="min-h-0 flex-1 overflow-y-auto">
      <ul className="space-y-1">
        {repos.map((repo) => {
          const name = getRepoDisplayName(repo);
          const selected = pathname === `/repo/${repo._id}`;
          const row = (
            <div
              className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${
                selected
                  ? "bg-zinc-800/80 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <GitBranch className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <RepoStatusBadge status={repo.status} error={repo.error} />
            </div>
          );

          return (
            <li key={repo._id}>
              {repo.status === "ready" ? (
                <Link
                  href={`/repo/${encodeURIComponent(repo._id)}`}
                  onClick={onNavigate}
                  aria-current={selected ? "page" : undefined}
                  aria-label={`Open chat for ${name}`}
                  className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {row}
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="cursor-not-allowed opacity-75"
                  title={repo.status === "ingesting" ? "Indexing in progress" : undefined}
                >
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
