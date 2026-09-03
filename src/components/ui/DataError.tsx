import { Button } from "@/components/watermelon-ui/button";
export function DataError({
  onRetry,
  message = "Impossibile caricare i dati.",
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <div role="alert" className="rounded-xl border border-wm-destructive/30 bg-wm-destructive/5 p-5">
      <p className="mb-3 text-sm text-wm-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Riprova
      </Button>
    </div>
  );
}
