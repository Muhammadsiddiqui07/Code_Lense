"use client";

import { useRef, useState } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({ onSubmit, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  function submit() {
    const question = value.trim();
    if (!question || disabled) return;
    onSubmit(question);
    setValue("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-2 shadow-xl shadow-black/20 transition-colors focus-within:border-emerald-500/60"
    >
      <label htmlFor="chat-question" className="sr-only">
        Ask a question about this repository
      </label>
      <Textarea
        ref={textareaRef}
        id="chat-question"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={2}
        placeholder="Ask anything about this codebase..."
        className="max-h-40 min-h-14 resize-y border-0 bg-transparent px-3 py-2.5 text-sm shadow-none placeholder:text-zinc-600 focus-visible:border-0 focus-visible:ring-0 disabled:opacity-60"
      />
      <div className="flex items-center justify-between px-1 pb-0.5 pt-1">
        <span className="text-[11px] text-zinc-600">Shift + Enter for a new line</span>
        <Button
          type="submit"
          size="icon"
          aria-label="Send message"
          disabled={disabled || !value.trim()}
          className="size-9 rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {disabled ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </form>
  );
}
