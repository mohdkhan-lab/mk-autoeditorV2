import { promises as fs } from "node:fs";
import path from "node:path";

export async function POST(req) {
  try {
    const data = await req.json();
    const ticketId = "TICK-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    
    const record = {
      ticketId,
      receivedAt: new Date().toISOString(),
      userName: data.userName || "Anonymous User",
      contact: data.contact || "None provided",
      topic: data.topic || "general_help",
      error: data.error || null,
      message: data.message || "",
      diagnostics: data.diagnostics || null,
    };

    console.log(">>> [SUPPORT TICKET RECEIVED]", record);

    try {
      const logFile = process.env.VERCEL
        ? path.join("/tmp", "support-tickets.log")
        : path.join(process.cwd(), "support-tickets.log");
      
      const logEntry = `----------------------------------------\nTICKET ID: ${ticketId}\nTIME: ${record.receivedAt}\nUSER: ${record.userName} (${record.contact})\nTOPIC: ${record.topic}\nERROR: ${JSON.stringify(record.error)}\nMESSAGE: ${record.message}\nDIAGNOSTICS: ${JSON.stringify(record.diagnostics, null, 2)}\n\n`;
      
      await fs.appendFile(logFile, logEntry, "utf8");
    } catch (fsErr) {
      console.warn("Could not append to local support-tickets.log:", fsErr.message);
    }

    return Response.json({
      ok: true,
      ticketId,
      message: "Support ticket registered successfully. Developer has been notified."
    });
  } catch (err) {
    console.error("Support API error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
