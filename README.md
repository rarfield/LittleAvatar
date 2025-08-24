# 🎨 LittleAvatar API

LittleAvatar is a simple **Express.js API** that generates **Minecraft player avatars** from LittleSkin (Yggdrasil-compatible) servers.  
It extracts the **face + overlay (hat layer)** from the player’s skin and renders it as a PNG image.  

---

## ✨ Features
- Get avatars by **UUID** or **username**  
- Supports **custom resolutions** via `?res=` (e.g. `?res=1024`)  
- Supports **file download** via `?download`  
- Works with **LittleSkin Yggdrasil API**  
- Rendered using [sharp](https://sharp.pixelplumbing.com/) for fast image processing  

---

## 📦 Installation

```bash
# Clone repo
git clone https://github.com/rarfield/LittleAvatar.git
cd LittleAvatar

# Install dependencies
npm install

# Run server
npm start
````

Server will run on `http://localhost:3000` by default.

---

## 🔌 API Endpoints

### 1. Get avatar by UUID

```
GET /avatar/:uuid.png
```

**Example:**

```
http://localhost:3000/avatar/8667ba71b85a4004af54457a9734eed7.png
```

---

### 2. Get avatar by username

```
GET /avatar/playername/:name.png
```

**Example:**

```
http://localhost:3000/avatar/playername/Notch.png
```

---

## ⚙️ Query Parameters

* `?res=<size>` → Set resolution (default `256`, min `8`, max `4096`)
  Example:

  ```
  /avatar/uuid.png?res=1024
  ```

  → returns a **1024x1024 PNG**

* `?download` → Force download instead of inline display
  Example:

  ```
  /avatar/playername/Steve.png?download
  ```

  → prompts download `Steve_256.png`

* Combine both:

  ```
  /avatar/playername/Steve.png?res=1024&download
  ```

  → downloads `Steve_1024.png`

---

## 🛠 Tech Stack

* **Node.js** + **Express.js**
* **node-fetch** for HTTP requests
* **sharp** for image processing
* **LittleSkin API** as data source

---

## 🚧 Notes

* Default size is `256x256` if `?res` is not provided.
* Skins without a valid face/overlay will return a `404`.
* Extremely high resolutions may use a lot of memory — capped at `4096x4096`.

---

## 📜 License

MIT — free to use, modify, and distribute.

---

Made with ❤️ for LittleSkin community
