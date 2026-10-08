"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  /** The search currently applied (from the URL). */
  value: string;
  /** Called 300 ms after the user stops typing, so we don't send one request per letter. */
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

const DEBOUNCE_MS = 300;

/** A search box with a clear button that waits for the user to stop typing before searching. */
export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  const [text, setText] = useState(value);
  // The last URL value we reacted to, and the last search we asked for.
  const [seen, setSeen] = useState(value);
  const [sent, setSent] = useState(value);

  // The URL changed. If it's not the search we asked for, it came from outside (e.g. a
  // "Clear filters" button), so show it. If it is ours, keep the text: the user may have
  // typed more while the URL was updating.
  // Updating state during render like this is React's recommended way to sync with a prop.
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) {
      setSent(value);
      setText(value);
    }
  }

  const send = (next: string) => {
    setSent(next);
    onChange(next);
  };

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === sent) return;
    const timer = setTimeout(() => {
      setSent(trimmed);
      onChange(trimmed);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, sent, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={100}
        className="ps-9 pe-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            send("");
          }}
          className="absolute end-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
