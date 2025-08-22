
import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export default function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [temp, setTemp] = useState("");

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setTemp("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(temp);
    } else if (e.key === "Backspace" && !temp && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">
            {t}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(value.filter((x) => x !== t))}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder || "Add a tag and press Enter"}
        aria-label="Add tag"
      />
    </div>
  );
}
