import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { account } from "@/composition/container";
import { actorFor, can } from "@/core/domain/access/actor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { user } = await account().currentActor();
        if (!user || !can(actorFor(user), "catalog.manage")) throw new Error("forbidden");
        if (!pathname.startsWith("products/")) throw new Error("invalid_path");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
          maximumSizeInBytes: 4 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_failed";
    return Response.json({ error: message }, { status: message === "forbidden" ? 403 : 400 });
  }
}
