import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ImageUpload } from "@/lib/models/ImageUpload";
import { getAdminEmail } from "@/lib/auth";

// Types autorisés pour les photos importées
const TYPES_OK = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const dataUrl = typeof body?.data === "string" ? body.data : "";

    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) {
      return NextResponse.json({ error: "Image invalide." }, { status: 400 });
    }
    const [, contentType, base64] = m;
    if (!TYPES_OK.includes(contentType)) {
      return NextResponse.json({ error: "Format non supporté (JPEG, PNG ou WebP)." }, { status: 400 });
    }
    // Garde-fou : ~2 Mo de données binaires max
    if (base64.length > (2 * 1024 * 1024 * 4) / 3) {
      return NextResponse.json({ error: "Image trop lourde (2 Mo max)." }, { status: 413 });
    }
    const data = Buffer.from(base64, "base64");
    if (data.length === 0) {
      return NextResponse.json({ error: "Image vide." }, { status: 400 });
    }

    await connectDB();
    const doc = await ImageUpload.create({ data, contentType });
    return NextResponse.json({ image: `/api/images/${String(doc._id)}` });
  } catch (e) {
    console.error("POST /api/admin/image", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
