"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  nameLabel = "Name",
  namePlaceholder,
  defaultName = "",
  withSummary = false,
  summaryLabel = "Change summary",
  submitLabel = "Save",
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  defaultName?: string;
  withSummary?: boolean;
  summaryLabel?: string;
  submitLabel?: string;
  onSubmit: (name: string, summary?: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setSummary("");
    }
  }, [open, defaultName]);

  function submit() {
    if (!name.trim()) return;
    onSubmit(name.trim(), withSummary ? summary.trim() : undefined);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name-dialog-name">{nameLabel}</Label>
            <Input
              id="name-dialog-name"
              value={name}
              placeholder={namePlaceholder}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !withSummary) submit();
              }}
            />
          </div>
          {withSummary && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name-dialog-summary">{summaryLabel}</Label>
              <Textarea
                id="name-dialog-summary"
                value={summary}
                rows={3}
                placeholder="What changed and why"
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
