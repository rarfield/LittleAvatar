import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";

const app = express();
const PORT = process.env.PORT || 3000;

// Ely.by endpoints
const SKINS_BASE = "http://skinsystem.ely.by";
const SESSION_BASE = "https://authserver.ely.by/session/profile";

// Helper: strip dashes if someone pastes Mojang-style UUID
function cleanUUID(uuid) {
  return uuid.replace(/-/g, "");
}

// Helper: render face + overlay
async function renderAvatar(skinBuffer, size = 256) {
  const baseFace = await sharp(skinBuffer)
    .extract({ left: 8, top: 8, width: 8, height: 8 })
    .resize(size, size, { kernel: "nearest" })
    .png()
    .toBuffer();

  const overlayFace = await sharp(skinBuffer)
    .extract({ left: 40, top: 8, width: 8, height: 8 })
    .resize(size, size, { kernel: "nearest" })
    .png()
    .toBuffer();

  return await sharp(baseFace)
    .composite([{ input: overlayFace }])
    .png()
    .toBuffer();
}

// UUID → playername
async function getPlayerNameFromUUID(uuid) {
  const resp = await fetch(`${SESSION_BASE}/${uuid}`);
  if (!resp.ok) throw new Error("Profile not found");
  const data = await resp.json();
  if (!data?.name) throw new Error("Username not found");
  return data.name;
}

// Fetch raw skin PNG by username
async function fetchSkinByName(name) {
  const url = `${SKINS_BASE}/skins/${encodeURIComponent(name)}.png`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Skin not found");
  return Buffer.from(await resp.arrayBuffer());
}

// ===== UUID endpoint =====
app.get("/avatar/:uuid.png", async (req, res) => {
  try {
    const uuid = cleanUUID(req.params.uuid);
    const size = Math.min(Math.max(parseInt(req.query.res) || 256, 8), 4096);

    const playerName = await getPlayerNameFromUUID(uuid);
    const skinBuffer = await fetchSkinByName(playerName);

    const avatar = await renderAvatar(skinBuffer, size);

    if (req.query.download !== undefined) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${uuid}_${size}.png"`
      );
    }

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=300, immutable");
    res.send(avatar);
  } catch (err) {
    console.error(err);
    const code =
      /not found/i.test(err.message) || /profile/i.test(err.message) ? 404 : 500;
    res.status(code).send(code === 404 ? "Profile/Skin not found" : "Server error");
  }
});

// ===== Username endpoint =====
app.get("/avatar/playername/:name.png", async (req, res) => {
  try {
    const { name } = req.params;
    const size = Math.min(Math.max(parseInt(req.query.res) || 256, 8), 4096);

    const skinBuffer = await fetchSkinByName(name);
    const avatar = await renderAvatar(skinBuffer, size);

    if (req.query.download !== undefined) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${name}_${size}.png"`
      );
    }

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=300, immutable");
    res.send(avatar);
  } catch (err) {
    console.error(err);
    const code = /not found/i.test(err.message) ? 404 : 500;
    res
      .status(code)
      .json({ error: code === 404 ? "Player or skin not found" : "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`ElyAvatar API running at http://localhost:${PORT}`);
});
