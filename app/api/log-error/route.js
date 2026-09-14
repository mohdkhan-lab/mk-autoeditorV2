import { promises as fs } from "node:fs";
import path from "node:path";

export async function POST(req) {
  try {
    const data = await req.json();
    console.error(">>> CAPTURED CLIENT ERROR:", data);
    try {
      const logFile = process.env.VERCEL
        ? path.join("/tmp", "client-error.log")
        : path.join(process.cwd(), "client-error.log");
      const logLine = `[${new Date().toISOString()}] CLIENT ERROR: ${JSON.stringify(data, null, 2)}\n\n`;
      await fs.appendFile(logFile, logLine);
    } catch (_) {}
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Failed to log client error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
