"use client";
import { ReminderEditor } from "./ReminderEditor";
export function ReminderCreateModal({ onClose }: { onClose: () => void }) {
  return <ReminderEditor onClose={onClose} />;
}
