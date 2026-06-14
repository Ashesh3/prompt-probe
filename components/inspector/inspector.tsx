"use client";

import { ModelsCard } from "./models-card";
import { SettingsCard } from "./settings-card";
import { LatestCard } from "./latest-card";

export function Inspector() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      <ModelsCard />
      <SettingsCard />
      <LatestCard />
    </div>
  );
}
