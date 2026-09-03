import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface NumericKeypadProps {
  digits: string;
  length: number;
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

export function NumericKeypad({ digits, length, disabled, onDigit, onBackspace }: NumericKeypadProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex justify-center gap-3">
        {Array.from({ length }).map((_, index) => (
          <span
            key={index}
            className={`flex h-12 w-9 items-center justify-center rounded-lg border-2 text-2xl font-semibold ${
              index < digits.length
                ? "border-primary-foreground bg-primary-foreground/15"
                : "border-primary-foreground/30"
            }`}
          >
            {index < digits.length ? "●" : ""}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(key)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/10 text-2xl font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/20 active:bg-primary-foreground/30 disabled:opacity-40"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/5 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/20 disabled:opacity-40"
        >
          <Delete className="h-6 w-6" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigit("0")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/10 text-2xl font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/20 active:bg-primary-foreground/30 disabled:opacity-40"
        >
          0
        </button>
        <div className="h-16 w-16" />
      </div>
    </div>
  );
}
