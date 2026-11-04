import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Admin } from "@/lib/models/Admin";
import { getAdminEmail } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    await connectDB();
    const admins = await Admin.find({}).select("email").lean();
    return NextResponse.json({
      admins,
      principal: (process.env.ADMIN_EMAIL || "admin@cesi.fr").toLowerCase(),
    });
  } catch (e) {
    console.error("GET /api/admin/comptes", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const { email, password } = await req.json();
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Mot de passe trop court (6 caractères minimum)." }, { status: 400 });
    }
    await connectDB();
    const existant = await Admin.findOne({ email: email.toLowerCase() }).lean();
    if (existant) {
      return NextResponse.json({ error: "Ce compte admin existe déjà." }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const nouveau = await Admin.create({ email: email.toLowerCase().trim(), passwordHash });
    return NextResponse.json({ admin: { _id: nouveau._id, email: nouveau.email } }, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/comptes", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
