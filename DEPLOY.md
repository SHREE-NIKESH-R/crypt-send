# ⚡ Quick Deploy — CryptSend

## 3 Services, All Free, ~10 Minutes

---

## 1. Cloudinary (file storage)
→ https://cloudinary.com/users/register/free
- Sign up → Dashboard → copy Cloud Name, API Key, API Secret

---

## 2. Render (Python backend)
→ https://render.com → New Web Service

Settings:
```
Root Directory:  backend
Build Command:   pip install -r requirements.txt
Start Command:   uvicorn main:app --host 0.0.0.0 --port $PORT
```

Environment Variables:
```
CLOUDINARY_CLOUD_NAME  = (your value)
CLOUDINARY_API_KEY     = (your value)
CLOUDINARY_API_SECRET  = (your value)
```

→ Copy your service URL: `https://YOUR-APP.onrender.com`

---

## 3. Update API URL in frontend

`frontend/js/send.js` line 4:
```js
const API = 'https://YOUR-APP.onrender.com';
```

`frontend/js/receive.js` line 4:
```js
const API = 'https://YOUR-APP.onrender.com';
```

---

## 4. Netlify (frontend)
→ https://netlify.com → Add site → Deploy manually
→ Drag & drop the `frontend/` folder
→ Done! Your app is live.

---

## Local Dev

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Cloudinary keys
python main.py          # runs on http://localhost:8000

# Frontend (new terminal)
cd frontend
python -m http.server 3000
# open http://localhost:3000
```
