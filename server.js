import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";

const app = express();
const PORT = process.env.PORT || 3000;

// Helper: strip dashes if someone pastes Mojang-style UUID
function cleanUUID(uuid) {
  return uuid.replace(/-/g, "");
}

// Helper: render full face (base + overlay) with custom size
async function renderAvatar(skinBuffer, size = 256) {
  // base face
  const baseFace = await sharp(skinBuffer)
    .extract({ left: 8, top: 8, width: 8, height: 8 })
    .resize(size, size, { kernel: "nearest" })
    .png()
    .toBuffer();

  // overlay face (hat layer)
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

// ===== UUID endpoint =====
app.get("/avatar/:uuid.png", async (req, res) => {
  try {
    const uuid = cleanUUID(req.params.uuid);

    // parse ?res= param, default 256
    const size = Math.min(Math.max(parseInt(req.query.res) || 256, 8), 4096);

    const resp = await fetch(
      `https://littleskin.cn/api/yggdrasil/sessionserver/session/minecraft/profile/${uuid}`
    );

    if (!resp.ok) {
      return res.status(404).send("Profile not found");
    }

    const data = await resp.json();
    const texturesProperty = data.properties.find((p) => p.name === "textures");
    if (!texturesProperty) {
      return res.status(404).send("No textures found");
    }

    const textures = JSON.parse(
      Buffer.from(texturesProperty.value, "base64").toString("utf8")
    );
    const skinUrl = textures.textures?.SKIN?.url;
    if (!skinUrl) {
      return res.status(404).send("Skin not found");
    }

    const skinResp = await fetch(skinUrl);
    const skinBuffer = Buffer.from(await skinResp.arrayBuffer());

    const avatar = await renderAvatar(skinBuffer, size);

    if (req.query.download !== undefined) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${uuid}_${size}.png"`
      );
    }

    res.set("Content-Type", "image/png");
    res.send(avatar);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ===== Username endpoint =====
app.get("/avatar/playername/:name.png", async (req, res) => {
  try {
    const { name } = req.params;

    // parse ?res= param, default 256
    const size = Math.min(Math.max(parseInt(req.query.res) || 256, 8), 4096);

    // Step 1: Lookup UUID by username
    const uuidResp = await fetch(
      "https://littleskin.cn/api/yggdrasil/api/profiles/minecraft",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([name]),
      }
    );

    if (!uuidResp.ok) {
      return res.status(404).json({ error: "Username lookup failed" });
    }

    const uuidData = await uuidResp.json();
    if (!uuidData.length) {
      return res.status(404).json({ error: "Player not found" });
    }

    const uuid = uuidData[0].id;

    // Step 2: Get profile & textures
    const resp = await fetch(
      `https://littleskin.cn/api/yggdrasil/sessionserver/session/minecraft/profile/${uuid}`
    );

    if (!resp.ok) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const data = await resp.json();
    const texturesProperty = data.properties.find((p) => p.name === "textures");
    if (!texturesProperty) {
      return res.status(404).json({ error: "No textures found" });
    }

    const textures = JSON.parse(
      Buffer.from(texturesProperty.value, "base64").toString("utf8")
    );
    const skinUrl = textures.textures?.SKIN?.url;
    if (!skinUrl) {
      return res.status(404).json({ error: "Skin not found" });
    }

    const skinResp = await fetch(skinUrl);
    const skinBuffer = Buffer.from(await skinResp.arrayBuffer());

    const avatar = await renderAvatar(skinBuffer, size);

    if (req.query.download !== undefined) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${name}_${size}.png"`
      );
    }

    res.set("Content-Type", "image/png");
    res.send(avatar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`LittleAvatar API running at http://localhost:${PORT}`);
});
