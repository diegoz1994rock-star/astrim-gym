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
      <img
        src={convertFileSrc(photoPath)}
        alt={name}
        onError={() => setFailed(true)}
        className={cn("rounded-full object-cover", className ?? "h-10 w-10")}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary",
        className ?? "h-10 w-10",
      )}
    >
      {getInitials(name)}
    </div>
  );
}
