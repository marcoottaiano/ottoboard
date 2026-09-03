"use client";
import { GoalEditor } from "./GoalEditor";
export function GoalCreateModal({ onClose }: { onClose: () => void }) {
  return <GoalEditor onClose={onClose} />;
}
