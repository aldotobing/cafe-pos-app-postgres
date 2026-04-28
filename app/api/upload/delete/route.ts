import { getAuthenticatedUser } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, r2Bucket } from "@/lib/r2";

// POST /api/upload/delete
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Extract filename from URL
    // URL format: https://img.kasirku.biz.id/menu/12345_abc.jpg
    const urlObj = new URL(url);
    let key = urlObj.pathname.slice(1); // Remove leading '/'

    // If the key includes the bucket name, remove it
    // e.g., "kasirku/menu/123.jpg" → "menu/123.jpg"
    const bucketName = process.env.R2_BUCKET_NAME;
    if (bucketName && key.startsWith(`${bucketName}/`)) {
      key = key.slice(bucketName.length + 1);
    }

    if (!key) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Security: Only allow deletion from known app folders
    const allowedPrefixes = ["menu/", "cafe/", "profile_images/"];
    if (!allowedPrefixes.some(prefix => key.startsWith(prefix))) {
      console.warn('[Delete Image API] Unauthorized deletion attempt:', key);
      return NextResponse.json({ error: "Forbidden: Can only delete app images" }, { status: 403 });
    }

    // Security: Prevent path traversal
    if (key.includes("..") || key.includes("\\") || key.startsWith("/") || key.includes(":")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    console.log('[Delete Image API] Deleting file from R2:', key);

    // Delete from R2
    const command = new DeleteObjectCommand({
      Bucket: r2Bucket,
      Key: key,
    });

    await r2Client.send(command);

    console.log('[Delete Image API] File deleted successfully:', key);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[Delete Image API] Error:", err);
    return NextResponse.json(
      { error: (err as any).message || "Failed to delete image" },
      { status: 500 }
    );
  }
}
