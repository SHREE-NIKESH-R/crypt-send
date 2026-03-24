# ⬡ CryptSend — Hybrid Encrypted File Transfer

RSA-2048 + AES-256-GCM encrypted file sharing in the browser.  
No accounts. Share with a 6-digit code. Auto-deleted after download.

---

## How It Works (Simple Version)

```
SENDER:
  Step 1 → Click "Generate RSA Keys"     → Browser creates RSA-2048 keypair
  Step 2 → Drop your file                → File selected locally
  Step 3 → Click "Encrypt File"          → AES-256 encrypts file, RSA seals the AES key
  Step 4 → Click "Upload & Get Code"     → Encrypted file goes to cloud → 6-digit code appears

RECEIVER:
  Step 1 → Enter 6-digit code            → Fetches encrypted file from cloud
  Step 2 → Click "Decrypt File"          → RSA unwraps AES key → AES decrypts file
  Step 3 → Click "Download"              → File saves to device → SERVER DELETES IT
```

---

## Project Structure

```
cryptsend/
├── frontend/
│   ├── index.html       ← Landing page
│   ├── send.html        ← Sender (4 steps)
│   ├── receive.html     ← Receiver (3 steps)
│   ├── css/main.css     ← All styles (retro light mode)
│   └── js/
│       ├── crypto.js    ← RSA + AES Web Crypto engine
│       ├── send.js      ← Send flow logic
│       ├── receive.js   ← Receive flow logic
│       └── main.js      ← Landing animations
├── backend/
│   ├── main.py          ← FastAPI server
│   ├── requirements.txt
│   └── .env.example
├── README.md
└── DEPLOY.md
```

---

## Local Setup (Run on Your Computer)

### Prerequisites
- Python 3.9 or higher
- Free account at https://cloudinary.com

### Step 1 — Get Cloudinary Credentials
1. Sign up free at https://cloudinary.com
2. Go to your Dashboard
3. Note down: **Cloud Name**, **API Key**, **API Secret**

### Step 2 — Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Mac/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install packages
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Open `.env` and fill in your Cloudinary values:
```
CLOUDINARY_CLOUD_NAME=mycloud
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

### Step 3 — Start Backend

```bash
python main.py
# Server starts at http://localhost:8000
```

Test it: open http://localhost:8000/health in browser — you should see `{"ok":true}`

### Step 4 — Configure Frontend

Open `frontend/js/send.js` — line 4:
```javascript
const API = 'http://localhost:8000';
```

Open `frontend/js/receive.js` — line 4:
```javascript
const API = 'http://localhost:8000';
```

### Step 5 — Start Frontend

```bash
cd frontend
python -m http.server 3000
```

Open http://localhost:3000 in your browser. Done!

---

## Deploy to Cloud (Free — Recommended for Lab Demo)

### Services Used (All Free)
| Service | Purpose | Free Tier |
|---|---|---|
| Cloudinary | Store encrypted files | 25GB storage |
| Render.com | Host Python backend | 750 hrs/month |
| Netlify | Host HTML frontend | Unlimited |

### Step 1 — Deploy Backend to Render

1. Go to https://render.com → sign up free
2. Click **New → Web Service**
3. Connect your GitHub (push `backend/` folder to a repo) or use manual deploy
4. Configure:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `CLOUDINARY_CLOUD_NAME` = your value
   - `CLOUDINARY_API_KEY` = your value  
   - `CLOUDINARY_API_SECRET` = your value
6. Click Deploy
7. **Copy your Render URL** — looks like `https://cryptsend-abc.onrender.com`

### Step 2 — Update Frontend with Backend URL

In `frontend/js/send.js` line 4:
```javascript
const API = 'https://cryptsend-abc.onrender.com';
```

In `frontend/js/receive.js` line 4:
```javascript
const API = 'https://cryptsend-abc.onrender.com';
```

### Step 3 — Deploy Frontend to Netlify

1. Go to https://netlify.com → sign up free
2. Click **Add new site → Deploy manually**
3. **Drag and drop the entire `frontend/` folder** onto the page
4. Your site goes live instantly at something like `https://cryptsend-xyz.netlify.app`

---

## Demo Script for Lab Teacher

**Show on Sender's browser:**

1. Open send.html
2. Click **"Generate RSA Keys"** → show the terminal log, fingerprint, key previews
3. Drop a file → file info appears
4. Click **"Encrypt File"** → show AES encryption progress, log messages
5. Click **"Upload & Get Code"** → show upload progress → 6-digit code appears
6. Write the code on the board / show QR

**Show on Receiver's browser (different tab or device):**

1. Open receive.html
2. Type the 6-digit code
3. Click **"Fetch File Info"** → show file name, size, expiry
4. Click **"Decrypt File"** → show RSA unwrap, AES decrypt progress
5. Click **"Download"** → file downloads
6. Go back to Sender → show the code is now gone / expired

**Key talking points:**
- All encryption happens in the browser (Web Crypto API)
- Server only stores ciphertext — it cannot read the file
- Private key is bundled with the encrypted package (so receiver only needs the code)
- AES-256-GCM provides authenticated encryption — detects tampering
- RSA-OAEP provides asymmetric key exchange

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Code not found" | Code expired (24h) or already downloaded |
| CORS error | Make sure API URL in send.js/receive.js is correct |
| Upload fails | Check Cloudinary credentials in .env |
| Decrypt fails | This shouldn't happen — means the payload was corrupted |
| QR not showing | QRCode.js CDN blocked — rest of app works fine |
| Render URL is slow first time | Render free tier sleeps after 15min inactivity, takes ~30s to wake |

---

## Security Notes

- **Zero knowledge server** — server only sees ciphertext
- **AES-256-GCM** — authenticated encryption, detects any tampering
- **RSA-OAEP-2048** — standard asymmetric key exchange
- **Web Crypto API** — native browser cryptography, no JS crypto libraries
- **Auto-delete** — files removed from Cloudinary after download or 24h

---

## License
MIT — free to use for educational purposes.
