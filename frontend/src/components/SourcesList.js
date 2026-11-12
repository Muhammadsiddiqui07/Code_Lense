import { ChevronDown, FileCode2 } from "lucide-react";

export default function SourcesList({ sources = [] }) {
  if (!sources.length) return null;

  return (
    <details className="group mt-4 border-t border-zinc-800/80 pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-zinc-500 outline-none transition-colors hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-400 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        Sources
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {sources.length}
        </span>
      </summary>
      <ul className="mt-3 flex flex-wrap gap-2">
        {sources.map((source, index) => {
          const label = `${source.file}:${source.start_line}`;
          return (
            <li key={`${label}-${index}`}>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300">
                <FileCode2 className="size-3.5 text-emerald-300" aria-hidden="true" />
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
