import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFriendlyError } from "@/lib/ui-utils";

const statusStyles = {
  ingesting: "bg-amber-400",
  ready: "bg-emerald-400",
  failed: "bg-red-400",
};

const statusLabels = {
  ingesting: "Indexing",
  ready: "Ready",
  failed: "Failed",
};

export default function RepoStatusBadge({ status, error }) {
  const normalizedStatus = statusStyles[status] ? status : "failed";
  const badge = (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/5 bg-zinc-900 px-2 py-1 text-[10px] font-medium leading-none ${
        normalizedStatus === "ingesting"
          ? "text-amber-200"
          : normalizedStatus === "ready"
            ? "text-emerald-200"
            : "text-red-200"
      }`}
      aria-label={`Repository status: ${statusLabels[normalizedStatus]}`}
    >
      <span
        className={`size-1.5 rounded-full ${statusStyles[normalizedStatus]} ${
          normalizedStatus === "ingesting" ? "animate-pulse" : ""
        }`}
        aria-hidden="true"
      />
      {statusLabels[normalizedStatus]}
    </span>
  );

  if (normalizedStatus !== "failed") return badge;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={getFriendlyError(error, "Indexing failed.")}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          />
        }
      >
        {badge}
      </TooltipTrigger>
      <TooltipContent className="border border-zinc-700 bg-zinc-900 text-zinc-200">
        {getFriendlyError(error, "Indexing failed. Try adding this repository again.")}
      </TooltipContent>
    </Tooltip>
  );
}
