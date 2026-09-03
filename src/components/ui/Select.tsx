"use client";
import { useId, type ReactNode } from "react";
import {
  Select as Root,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/watermelon-ui/select";
import { cn } from "@/lib/utils";
export interface SelectOption {
  value: string;
  label: ReactNode;
}
interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  showPlaceholder?: boolean;
  disabled?: boolean;
  className?: string;
  dropUp?: boolean;
  "aria-label"?: string;
}
export function Select({
  value,
  onChange,
  options,
  placeholder = "Seleziona...",
  showPlaceholder = true,
  disabled = false,
  className,
  dropUp = false,
  "aria-label": label,
}: Props) {
  const id = useId();
  const emptyValue = `empty-${id}`;
  return (
    <Root value={value || ""} onValueChange={(next) => onChange(next === emptyValue ? "" : next)} disabled={disabled}>
      <SelectTrigger aria-label={label ?? placeholder} className={cn("w-full min-w-0 bg-wm-background", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" side={dropUp ? "top" : "bottom"}>
        {showPlaceholder && <SelectItem value={emptyValue}>{placeholder}</SelectItem>}
        {options
          .filter((option) => option.value !== "")
          .map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Root>
  );
}
