
const PRESETS = ["#3A86FF", "#0B132B", "#1C2541", "#36B37E", "#FFB020", "#E33E3E"];

export default function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          className={`h-7 w-7 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${value === c ? "ring-2 ring-ring" : ""}`}
          style={{ backgroundColor: c }}
          aria-label={`Select color ${c}`}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
