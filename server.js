import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";

const app = express();
const PORT = process.env.PORT || 3000;

// Helper: strip dashes if someone pastes Mojang-style UUID
function cleanUUID(uuid) {
  return uuid.replace(/-/g, "");
}

app.get("/avatar/:uuid.png", async (req, res) => {
  try {
    const uuid = cleanUUID(req.params.uuid);

    // hit LittleSkin sessionserver
    const resp = await fetch(
      `https://littleskin.cn/api/yggdrasil/sessionserver/session/minecraft/profile/${uuid}`
    );

    if (!resp.ok) {
      return res.status(404).send("Profile not found");
    }

    const data = await resp.json();

    // grab textures field
    const texturesProperty = data.properties.find((p) => p.name === "textures");
    if (!texturesProperty) {
      return res.status(404).send("No textures found");
    }

    // decode base64
    const textures = JSON.parse(
      Buffer.from(texturesProperty.value, "base64").toString("utf8")
    );

    const skinUrl = textures.textures.SKIN.url;

    // fetch actual skin png
    const skinResp = await fetch(skinUrl);
    const skinBuffer = Buffer.from(await skinResp.arrayBuffer());

    // crop 8x8 head from 64x64 skin → upscale to 256x256
    const head = await sharp(skinBuffer)
      .extract({ left: 8, top: 8, width: 8, height: 8 })
      .resize(256, 256, { kernel: "nearest" })
      .png()
      .toBuffer();

    res.set("Content-Type", "image/png");
    res.send(head);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`LittleAvatar API running at http://localhost:${PORT}`);
});
