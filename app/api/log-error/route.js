import { promises as fs } from "node:fs";
import path from "node:path";

export async function POST(req) {
  try {
    const data = await req.json();
    const logLine = `[${new Date().toISOString()}] CLIENT ERROR: ${JSON.stringify(data, null, 2)}\n\n`;
    console.error(">>> CAPTURED CLIENT ERROR:", data);
    const logFile = path.join(process.cwd(), "client-error.log");
    await fs.appendFile(logFile, logLine);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Failed to log client error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
