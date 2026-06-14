import { useState } from "react";
import { Link2, Check, X } from "lucide-react";

interface Props {
  url: string;
  onChange: (next: string) => void;
}

export function CsvUrlInput({ url, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(url);

  if (!open) {
    return (
      <button
        onClick={() => {
          setDraft(url);
          setOpen(true);
        }}
        className="btn-glass"
        title="Ganti URL CSV sumber data"
      >
        <Link2 className="h-4 w-4" />
        <span className="hidden sm:inline">Sumber CSV</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="https://docs.google.com/…/pub?gid=…&output=csv"
        className="input min-w-[260px] sm:min-w-[420px]"
        autoFocus
      />
      <button
        onClick={() => {
          if (draft.trim()) onChange(draft.trim());
          setOpen(false);
        }}
        className="btn-primary"
        title="Pakai URL ini"
      >
        <Check className="h-4 w-4" />
      </button>
      <button onClick={() => setOpen(false)} className="btn-glass" title="Batal">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
