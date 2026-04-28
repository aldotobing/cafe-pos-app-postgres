import { getAuthenticatedUser } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, r2Bucket } from "@/lib/r2";
import sharp from "sharp";

// POST /api/upload/image
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "menu";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size too large. Max 5MB." }, { status: 400 });
    }

    // Security: Validate folder parameter
    const allowedFolders = ["menu", "cafe"];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder parameter" }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;

    // Security: Validate filename doesn't contain path traversal
    if (filename.includes("..") || filename.includes("\\") || (!filename.startsWith("menu/") && !filename.startsWith("cafe/"))) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Fix EXIF orientation (auto-rotate based on camera orientation data)
    let processedBuffer: Buffer;
    let outputFormat = file.type;

    try {
      const image = sharp(buffer);

      // Auto-rotate based on EXIF orientation data
      image.rotate();

      // Get metadata to determine output format
      const metadata = await image.metadata();

      // Preserve PNG format, convert everything else to JPEG
      if (metadata.format === 'png' || file.type === 'image/png') {
        outputFormat = 'image/png';
        processedBuffer = await image.png().toBuffer();
      } else if (file.type === 'image/webp') {
        outputFormat = 'image/webp';
        processedBuffer = await image.webp().toBuffer();
      } else {
        outputFormat = 'image/jpeg';
        processedBuffer = await image.jpeg({ quality: 85 }).toBuffer();
      }

      // Update filename extension
      let finalFilename = filename;
      if (outputFormat === 'image/png') {
        finalFilename = filename.replace(/\.[^.]+$/, '.png');
      } else if (outputFormat === 'image/webp') {
        finalFilename = filename.replace(/\.[^.]+$/, '.webp');
      } else {
        finalFilename = filename.replace(/\.[^.]+$/, '.jpg');
      }

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: r2Bucket,
        Key: finalFilename,
        Body: processedBuffer,
        ContentType: outputFormat,
      });

      await r2Client.send(command);

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${finalFilename}`;

      console.log('[Upload API] File uploaded successfully:', finalFilename);

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: finalFilename,
      });
    } catch (sharpErr: any) {
      console.error('[Upload API] Sharp processing error:', sharpErr);
      // Fallback: upload original buffer without processing
      const command = new PutObjectCommand({
        Bucket: r2Bucket,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      });

      await r2Client.send(command);

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
        note: 'EXIF rotation failed, original file uploaded',
      });
    }
  } catch (err: any) {
    console.error("[Upload API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
