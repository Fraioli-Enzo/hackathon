import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ImageUpload } from "@/lib/models/ImageUpload";

// Photo public d'un produit : accessible sans session (catalogue élève).
// Les images ne changent jamais, cache long.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new NextResponse("Image introuvable.", { status: 404 });
  }
  try {
    await connectDB();
    const doc = await ImageUpload.findById(id);
    if (!doc) {
      return new NextResponse("Image introuvable.", { status: 404 });
    }
    return new NextResponse(new Uint8Array(doc.data), {
      headers: {
        "Content-Type": doc.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("GET /api/images/" + id, e);
    return new NextResponse("Erreur serveur.", { status: 500 });
  }
}
