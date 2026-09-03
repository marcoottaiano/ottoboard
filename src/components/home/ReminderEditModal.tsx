"use client";
import type { Reminder } from "@/types";
import { ReminderEditor } from "./ReminderEditor";
export function ReminderEditModal({ reminder, onClose }: { reminder: Reminder; onClose: () => void }) {
  return <ReminderEditor reminder={reminder} onClose={onClose} />;
}
