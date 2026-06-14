"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Trash button with an inline confirmation popover for destructive deletes. */
export function ConfirmDelete({
  onConfirm,
  label,
  className,
}: {
  onConfirm: () => void;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Delete ${label}`}
            title={`Delete ${label}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "rounded-md bg-panel/80 p-1 text-faint transition-colors hover:bg-hover hover:text-filter",
              className,
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        }
      />
      <PopoverContent align="end" className="w-60 gap-3">
        <p className="text-[12px] leading-relaxed text-secondary-foreground">
          Delete {label}? This can’t be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-filter text-white hover:bg-filter/90"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
