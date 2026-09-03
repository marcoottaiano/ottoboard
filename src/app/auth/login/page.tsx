"use client";
import { Suspense, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/watermelon-ui/card";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { Skeleton } from "@/components/watermelon-ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/watermelon-ui/tabs";

type AuthTab = "login" | "register";
function InputField({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={type === "password" && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className={type === "password" ? "min-h-11 pr-12" : "min-h-11"}
        />
        {type === "password" && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 min-h-11 min-w-11"
            aria-label={show ? "Nascondi password" : "Mostra password"}
            aria-pressed={show}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </Button>
        )}
      </div>
    </div>
  );
}
function LoginContent() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSent, setRegisterSent] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();
  const search = useSearchParams();
  function changeTab(value: string) {
    if (submitting.current || (value !== "login" && value !== "register")) return;
    setTab(value);
    setEmail("");
    setPassword("");
    setConfirm("");
    setError(null);
    setRegisterSent(false);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    if (tab === "register" && password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (tab === "register" && password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const supabase = createClient();
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError("Email o password non corretti.");
          return;
        }
        router.push("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        if (data.session) {
          router.push("/onboarding");
          router.refresh();
        } else setRegisterSent(true);
      }
    } catch {
      setError("Operazione non riuscita. Riprova.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tab === "login" ? "Bentornato" : "Crea il tuo account"}
        </h1>
        <p className="mt-2 text-sm text-wm-muted-foreground">Il tuo spazio per finanze e benessere.</p>
      </div>
      <Card className="p-5 md:p-7">
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList aria-label="Accesso account" className="mb-6 w-full">
            <TabsTrigger value="login" disabled={loading} className="flex-1">
              Accedi
            </TabsTrigger>
            <TabsTrigger value="register" disabled={loading} className="flex-1">
              Registrati
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            {search.get("reset") === "success" && tab === "login" && (
              <p role="status" className="mb-4 rounded-lg bg-wm-success/10 p-3 text-sm text-wm-success">
                Password aggiornata. Accedi con la nuova password.
              </p>
            )}
            {registerSent ? (
              <div className="space-y-3 py-4 text-center" role="status">
                <Mail className="mx-auto text-wm-success" size={28} />
                <h2 className="font-semibold">Controlla la tua email</h2>
                <p className="break-words text-sm text-wm-muted-foreground">
                  Apri il link inviato a {email} per confermare il tuo account.
                </p>
                <Button variant="outline" onClick={() => changeTab("login")}>
                  Torna al login
                </Button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <fieldset disabled={loading} className="min-w-0 space-y-4">
                  <InputField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                  <InputField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                  />
                  {tab === "register" && (
                    <InputField
                      label="Conferma password"
                      type="password"
                      value={confirm}
                      onChange={setConfirm}
                      autoComplete="new-password"
                    />
                  )}
                  {tab === "login" && (
                    <Link
                      href="/auth/forgot-password"
                      className="inline-flex min-h-11 items-center rounded text-sm text-wm-primary"
                    >
                      Hai dimenticato la password?
                    </Link>
                  )}
                  {error && (
                    <p role="alert" className="rounded-lg bg-wm-destructive/10 p-3 text-sm text-wm-destructive">
                      {error}
                    </p>
                  )}
                  <Button type="submit" size="auto" className="w-full" disabled={loading}>
                    {loading ? "Attendi..." : tab === "login" ? "Accedi" : "Crea account"}
                  </Button>
                </fieldset>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md p-6">
          <Skeleton className="h-96" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
