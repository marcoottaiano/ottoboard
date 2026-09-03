import { Card } from "@/components/watermelon-ui/card";
import { User as UserIcon, Mail, Calendar } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface AccountInfoSectionProps {
  user: User;
}

export function AccountInfoSection({ user }: AccountInfoSectionProps) {
  const createdAt = new Date(user.created_at).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="rounded-xl border border-wm-border bg-wm-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <UserIcon size={16} className="text-wm-info" />
        <h2 className="text-sm font-semibold text-wm-foreground">Informazioni account</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Mail size={14} className="text-wm-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-wm-muted-foreground mb-0.5">Email</p>
            <p className="break-all text-sm text-wm-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar size={14} className="text-wm-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-xs text-wm-muted-foreground mb-0.5">Account creato il</p>
            <p className="text-sm text-wm-foreground">{createdAt}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
