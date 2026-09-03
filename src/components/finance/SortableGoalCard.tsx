"use client";

import { Button } from "@/components/watermelon-ui/button";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { GoalCard } from "./GoalCard";
import { FinancialGoal } from "@/types";

interface Props {
  goal: FinancialGoal;
  allocatedAmount?: number;
  onEdit: () => void;
  isDraggable: boolean;
}

export function SortableGoalCard({ goal, allocatedAmount, onEdit, isDraggable }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isDraggable && (
        <Button
          variant="ghost"
          size="sm"
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-wm-muted-foreground hover:text-wm-muted-foreground z-10 transition-colors p-1.5 rounded-lg hover:bg-wm-muted"
          title="Trascina per riordinare"
          aria-label={`Trascina per riordinare l'obiettivo "${goal.name}"`}
        >
          <GripVertical size={14} />
        </Button>
      )}
      <div className={isDraggable ? "pl-7" : ""}>
        <GoalCard goal={goal} allocatedAmount={allocatedAmount} onEdit={onEdit} />
      </div>
    </div>
  );
}
