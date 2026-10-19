import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  return NextResponse.json({ email: admin });
}
