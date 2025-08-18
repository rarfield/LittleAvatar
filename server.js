// server.js
import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";

const app = express();
const PORT = process.env.PORT || 3000;

// avatar from UUID
app.get("/avatar/:uuid.png", async (req, res) => {
  const uuid = req.params.uuid;

  try {
    const profileUrl = `https://littleskin.cn/api/yggdrasil/sessionserver/session/minecraft/profile/${uuid}`;
    const response = await fetch(profileUrl);
    if (!response.ok) throw new Error("Profile not found");

    const profile = await response.json();

    const texturesProperty = profile.properties.find((p) => p.name === "textures");
    if (!texturesProperty) throw new Error("No textures found");

    const textures = JSON.parse(
      Buffer.from(texturesProperty.value, "base64").toString("utf-8")
    );
    const skinUrl = textures.textures.SKIN.url;

    const skinResponse = await fetch(skinUrl);
    const skinBuffer = Buffer.from(await skinResponse.arrayBuffer());

    // crop the face 8x8 from (8,8)
    const avatar = await sharp(skinBuffer)
      .extract({ left: 8, top: 8, width: 8, height: 8 })
      .resize(64, 64, { kernel: "nearest" })
      .png()
      .toBuffer();

    res.set("Content-Type", "image/png");
    res.send(avatar);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// avatar from username
app.get("/avatar/playername/:username.png", async (req, res) => {
  const username = req.params.username;

  try {
    const skinUrl = `https://littleskin.cn/skin/${username}.png`;

    const skinResponse = await fetch(skinUrl);
    if (!skinResponse.ok) throw new Error("Player skin not found");

    const skinBuffer = Buffer.from(await skinResponse.arrayBuffer());

    // crop the face 8x8 from (8,8)
    const avatar = await sharp(skinBuffer)
      .extract({ left: 8, top: 8, width: 8, height: 8 })
      .resize(64, 64, { kernel: "nearest" })
      .png()
      .toBuffer();

    res.set("Content-Type", "image/png");
    res.send(avatar);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ LittleAvatar running on port ${PORT}`);
});
