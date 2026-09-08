import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface AvatarProps {
  name: string;
  photoPath?: string | null;
  className?: string;
}

export function Avatar({ name, photoPath, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (photoPath && !failed) {
    return (
      <span className={cn("block shrink-0 overflow-hidden rounded-full", className ?? "h-10 w-10")}>
        <img
          src={convertFileSrc(photoPath)}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground",
        className ?? "h-10 w-10",
      )}
    >
      {getInitials(name)}
    </div>
  );
}
