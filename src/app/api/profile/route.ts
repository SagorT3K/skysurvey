import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// Demographic options shared with the profile form. Values are self-reported;
// admins compare them against router complaints on the user detail page.
const OPTIONS: Record<string, string[]> = {
  gender: ["", "Female", "Male", "Non-binary", "Prefer not to say"],
  ageGroup: ["", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
  ethnicity: ["", "White", "Black or African American", "Hispanic or Latino", "Asian", "Native American", "Middle Eastern", "Multiracial", "Other", "Prefer not to say"],
  education: ["", "High school or below", "Some college", "Bachelor's degree", "Graduate degree", "Prefer not to say"],
  householdIncome: ["", "Under $25k", "$25k-$50k", "$50k-$75k", "$75k-$100k", "$100k-$150k", "$150k+", "Prefer not to say"],
  employment: ["", "Employed full-time", "Employed part-time", "Self-employed", "Student", "Homemaker", "Retired", "Unemployed"],
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, options: OPTIONS });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.heldUntil && user.heldUntil.getTime() > Date.now()) {
    return NextResponse.json({ error: "Your account is on hold — profile editing is paused." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Profile fields object required" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(OPTIONS)) {
    if (typeof body[key] === "string") {
      const value = (body[key] as string).trim();
      if (!allowed.includes(value)) {
        return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
      }
      data[key] = value;
    }
  }
  if (typeof body.username === "string") {
    const name = body.username.trim().slice(0, 40);
    if (name) data.username = name;
  }
  if (typeof body.state === "string") {
    data.state = body.state.trim().slice(0, 60);
  }
  if (typeof body.paypalEmail === "string") {
    const email = body.paypalEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "PayPal email is not valid" }, { status: 400 });
    }
    data.paypalEmail = email;
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
}
