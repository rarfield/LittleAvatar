import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Regex check for UUID ---
function isUUID(str) {
  return /^[0-9a-f]{32}$/i.test(str); // no dashes, just 32 hex chars
}

// --- Fetch profile by UUID ---
async function getProfileByUUID(uuid) {
  const res = await fetch(
    `https://littleskin.cn/api/yggdrasil/sessionserver/session/minecraft/profile/${uuid}`
  );
  if (!res.ok) throw new Error("Profile not found");
  return res.json();
}

// --- Fetch profile by Username ---
async function getProfileByName(username) {
  const res = await fetch(
    `https://littleskin.cn/api/yggdrasil/api/profiles/minecraft/${username}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([username]),
    }
  );
  if (!res.ok) throw new Error("Username lookup failed");
  const data = await res.json();
  if (!data.length) throw new Error("Player not found");
  return getProfileByUUID(data[0].id);
}

// --- Render just the head ---
async function renderHead(skinUrl) {
  const res = await fetch(skinUrl);
  if (!res.ok) throw new Error("Skin not found");
  const buffer = await res.arrayBuffer();

  return sharp(Buffer.from(buffer))
    .extract({ left: 8, top: 8, width: 8, height: 8 }) // face pixels
    .resize(256, 256, { kernel: "nearest" }) // upscale pixel-style
    .png()
    .toBuffer();
}

// --- Endpoint (Auto-detect UUID or Username) ---
app.get("/avatar/:id.png", async (req, res) => {
  try {
    const idOrName = req.params.id;
    let profile;

    if (isUUID(idOrName)) {
      profile = await getProfileByUUID(idOrName);
    } else {
      profile = await getProfileByName(idOrName);
    }

    const textures = JSON.parse(
      Buffer.from(profile.properties[0].value, "base64").toString()
    );
    const skinUrl = textures.textures.SKIN.url;

    const head = await renderHead(skinUrl);
    res.set("Content-Type", "image/png").send(head);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
