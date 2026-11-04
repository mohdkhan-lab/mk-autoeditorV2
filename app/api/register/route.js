import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// File path for persistent user storage on server
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "registered-users.json");

// Ensure data directory exists
function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initialUsers = [
        {
          id: "usr-mk-101",
          name: "Aman Verma",
          phone: "+91 8899001122",
          email: "aman.creator@gmail.com",
          niche: "YouTube Shorts & Reels",
          registeredAt: "2026-11-02",
          source: "MK AutoEditor V2",
        },
        {
          id: "usr-mk-102",
          name: "Rohan Gupta",
          phone: "+91 9876501234",
          email: "rohan.edits@gmail.com",
          niche: "Faceless Story Channels",
          registeredAt: "2026-11-02",
          source: "MK AutoEditor V2",
        },
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialUsers, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("Storage init warning:", err.message);
  }
}

function getUsers() {
  ensureDataFile();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read registered users:", err);
  }
  return [];
}

function saveUsers(users) {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to save registered users:", err);
    return false;
  }
}

export async function GET() {
  const users = getUsers();
  return NextResponse.json({
    success: true,
    totalCount: users.length,
    users,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, email, niche, source } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Name and WhatsApp number are required to access MK Studio tools." },
        { status: 400 }
      );
    }

    const users = getUsers();

    // Check if user with phone already registered
    const existingIndex = users.findIndex(
      (u) => u.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
    );

    const now = new Date().toISOString().slice(0, 10);
    let currentUser;

    if (existingIndex >= 0) {
      // Update existing user details
      users[existingIndex] = {
        ...users[existingIndex],
        name: name.trim(),
        email: (email || users[existingIndex].email || "").trim(),
        niche: niche || users[existingIndex].niche || "YouTube Creator",
        lastActive: now,
      };
      currentUser = users[existingIndex];
    } else {
      currentUser = {
        id: `usr-mk-${Date.now().toString().slice(-6)}`,
        name: name.trim(),
        phone: phone.trim(),
        email: (email || "").trim() || "N/A",
        niche: niche || "YouTube Shorts & Reels",
        registeredAt: now,
        lastActive: now,
        source: source || "MK AutoEditor V2 Web Studio",
      };
      users.unshift(currentUser);
    }

    saveUsers(users);

    return NextResponse.json({
      success: true,
      message: "Creator registration successful! Welcome to MK AutoEditor Studio.",
      user: currentUser,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { success: false, message: "Server registration failed: " + err.message },
      { status: 500 }
    );
  }
}

