import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Valida scope_days: solo '30' o 'all' ammessi
  const scopeDaysParam = searchParams.get("scope_days");
  const scopeDays = ["30", "all"].includes(scopeDaysParam ?? "") ? scopeDaysParam! : "30";

  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json({ error: "Strava non configurato" }, { status: 500 });
  }

  const redirectUri = `${appUrl}/api/strava/callback`;
  const scope = "activity:read_all";

  const statePayload = Buffer.from(JSON.stringify({ from: "onboarding", scope_days: scopeDays })).toString("base64");

  const stravaUrl = new URL("https://www.strava.com/oauth/authorize");
  stravaUrl.searchParams.set("client_id", clientId);
  stravaUrl.searchParams.set("redirect_uri", redirectUri);
  stravaUrl.searchParams.set("response_type", "code");
  stravaUrl.searchParams.set("scope", scope);
  stravaUrl.searchParams.set("state", statePayload);

  return NextResponse.redirect(stravaUrl.toString());
}
