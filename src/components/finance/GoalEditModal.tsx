"use client";
import { type FinancialGoal } from "@/types";
import { GoalEditor } from "./GoalEditor";
export function GoalEditModal({ goal, onClose }: { goal: FinancialGoal; onClose: () => void }) {
  return <GoalEditor goal={goal} onClose={onClose} />;
}
