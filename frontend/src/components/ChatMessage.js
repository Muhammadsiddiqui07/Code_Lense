import { Bot, UserRound } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import SourcesList from "@/components/SourcesList";

export default function ChatMessage({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`animate-message-in flex w-full gap-3 ${
        isAssistant ? "justify-start" : "justify-end"
      }`}
      aria-label={isAssistant ? "Assistant message" : "Your message"}
    >
      {isAssistant && (
        <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <Bot className="size-4" aria-hidden="true" />
        </div>
      )}
      <div
        className={`min-w-0 max-w-[min(90%,760px)] rounded-2xl px-4 py-3 ${
          isAssistant
            ? "border border-zinc-800/80 bg-zinc-900/60"
            : "bg-emerald-400 text-zinc-950"
        }`}
      >
        {isAssistant ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            <UserRound className="mr-1 inline size-3.5 align-[-2px] opacity-60" aria-hidden="true" />
            {message.content}
          </div>
        )}
        {isAssistant && <SourcesList sources={message.sources} />}
      </div>
    </article>
  );
}
