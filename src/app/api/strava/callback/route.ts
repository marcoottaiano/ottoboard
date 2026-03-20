import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  // Decodifica state
  let fromOnboarding = false;
  let scopeDays = "all";
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
      fromOnboarding = decoded.from === "onboarding";
      // Valida scope_days: solo '30' o 'all' ammessi
      scopeDays = ["30", "all"].includes(decoded.scope_days) ? decoded.scope_days : "all";
    } catch (err) {
      console.warn("[Strava] State decode failed:", err);
      // Fallback: assume da onboarding se possibile, default scope_days
    }
  }

  if (error || !code) {
    const redirectBase = fromOnboarding ? `${origin}/onboarding` : `${origin}/fitness`;
    return NextResponse.redirect(`${redirectBase}?error=strava_auth_denied`);
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const redirectBase = fromOnboarding ? `${origin}/onboarding` : `${origin}/fitness`;
    return NextResponse.redirect(`${redirectBase}?error=strava_not_configured`);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const redirectBase = fromOnboarding ? `${origin}/onboarding` : `${origin}/fitness`;
    return NextResponse.redirect(`${redirectBase}?error=strava_token_exchange`);
  }

  const tokenData = await tokenRes.json();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

  const { error: upsertError } = await supabase.from("strava_tokens").upsert({
    user_id: user.id,
    athlete_id: tokenData.athlete.id,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    scope: tokenData.scope,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    const redirectBase = fromOnboarding ? `${origin}/onboarding` : `${origin}/fitness`;
    return NextResponse.redirect(`${redirectBase}?error=strava_save_failed`);
  }

  // Trigger sync iniziale in background (non bloccante) con scope_days e timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  fetch(`${origin}/api/strava/sync?scope_days=${scopeDays}`, {
    method: "POST",
    headers: { Cookie: request.headers.get("cookie") ?? "" },
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) {
        console.error(`[Strava] Sync failed: ${res.status}`);
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        console.error("[Strava] Sync fetch error:", err.message);
      }
    })
    .finally(() => clearTimeout(timeout));

  if (fromOnboarding) {
    return NextResponse.redirect(`${origin}/onboarding?strava=connected`);
  }
  return NextResponse.redirect(`${origin}/fitness`);
}
