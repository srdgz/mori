import { getAuth } from "@/composition/auth";

const publicGet = [/^\/get-session$/, /^\/reset-password\/[^/]+$/, /^\/callback\/[^/]+$/, /^\/error$/, /^\/ok$/];
const publicPost = [/^\/callback\/[^/]+$/];

function allowed(request: Request): boolean {
  const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
  const rules = request.method === "GET" ? publicGet : request.method === "POST" ? publicPost : [];
  return rules.some((rule) => rule.test(path));
}

async function handle(request: Request): Promise<Response> {
  if (!allowed(request)) return new Response(null, { status: 404 });
  return getAuth().handler(request);
}

export { handle as GET, handle as POST };
