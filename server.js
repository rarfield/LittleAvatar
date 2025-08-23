import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Helper: strip dashes if someone pastes Mojang-style UUID
function cleanUUID(uuid) {
  return uuid.replace(/-/g, "");
}

// Helper: render full face (base + overlay)
async function renderAvatar(skinBuffer) {
  const baseFace = await sharp(skinBuffer)
    .extract({ left: 8, top: 8, width: 8, height: 8 })
    .resize(256, 256, { kernel: "nearest" })
    .png()
    .toBuffer();

  const overlayFace = await sharp(skinBuffer)
    .extract({ left: 40, top: 8, width: 8, height: 8 })
    .resize(256, 256, { kernel: "nearest" })
    .png()
    .toBuffer();

  return await sharp(baseFace)
    .composite([{ input: overlayFace }])
    .png()
    .toBuffer();
}

// ===== UUID endpoint =====
app.get("/avatar/:uuid.png", async (req, res) => {
  try {
    const uuid = cleanUUID(req.params.uuid);
    const download = req.query.download !== undefined; // check ?download

    const resp = await fetch(
      `https://littleskin.cn/api/yggdrasil/sessionserver/session/minecraft/profile/${uuid}`
    );
    if (!resp.ok) return res.status(404).send("Profile not found");

    const data = await resp.json();
    const texturesProperty = data.properties.find((p) => p.name === "textures");
    if (!texturesProperty) return res.status(404).send("No textures found");

    const textures = JSON.parse(
      Buffer.from(texturesProperty.value, "base64").toString("utf8")
    );
    const skinUrl = textures.textures?.SKIN?.url;
    if (!skinUrl) return res.status(404).send("Skin not found");

    const skinResp = await fetch(skinUrl);
    const skinBuffer = Buffer.from(await skinResp.arrayBuffer());

    const avatar = await renderAvatar(skinBuffer);

    res.set("Content-Type", "image/png");
    if (download) {
      res.set("Content-Disposition", `attachment; filename="${uuid}.png"`);
    }
    res.send(avatar);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ===== Playername endpoint =====
app.get("/avatar/playername/:name.png", async (req, res) => {
  try {
    const { name } = req.params;
    const download = req.query.download !== undefined; // check ?download

    const skinResp = await fetch(`https://littleskin.cn/skin/${name}.png`);
    if (!skinResp.ok) return res.status(404).json({ error: "Player not found" });

    const skinBuffer = Buffer.from(await skinResp.arrayBuffer());
    const avatar = await renderAvatar(skinBuffer);

    res.set("Content-Type", "image/png");
    if (download) {
      res.set("Content-Disposition", `attachment; filename="${name}.png"`);
    }
    res.send(avatar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`LittleAvatar API running at http://localhost:${PORT}`);
});
