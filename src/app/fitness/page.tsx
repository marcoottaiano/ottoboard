import { StravaConnect } from "@/components/fitness/StravaConnect";
import { createClient } from "@/lib/supabase/server";
import { FitnessContent } from "./FitnessContent";

export const dynamic = "force-dynamic";

async function isStravaConnected(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.from("strava_tokens").select("user_id").eq("user_id", userId).single();
  return !!data;
}

export default async function FitnessPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const connected = await isStravaConnected(user.id);

  if (!connected) {
    return (
      <main className="flex-1 p-6">
        <StravaConnect mode="full" />
      </main>
    );
  }

  return <FitnessContent />;
}
