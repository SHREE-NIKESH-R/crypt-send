"""
CryptSend Backend
- Upload encrypted files to Cloudinary
- Store metadata in-memory (resets on restart, files stay on Cloudinary)
- Download + auto-delete after download
- No database needed
"""

import os, base64, time
from datetime import datetime, timedelta
from typing import Optional

import cloudinary, cloudinary.uploader, cloudinary.api
import httpx

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ── Cloudinary config ────────────────────────────────────────────
cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key    = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure     = True,
)

app = FastAPI(title="CryptSend API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store ──────────────────────────────────────────────
# { code: { filename, filesize, cloudinary_url, cloudinary_id,
#           wrapped_key, private_key, public_key,
#           delete_after_download, expires_at, downloaded } }
store: dict = {}

# ── Models ───────────────────────────────────────────────────────
class UploadBody(BaseModel):
    code:                  str
    encrypted_file:        str   # base64
    wrapped_key:           str   # base64 (RSA-wrapped AES key)
    private_key:           str   # base64 pkcs8 — stored so receiver only needs the code
    public_key:            str   # base64 spki
    filename:              str
    filesize:              int
    delete_after_download: bool = True

# ── Routes ───────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service": "CryptSend", "status": "online"}

@app.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat()}


@app.post("/upload")
async def upload(body: UploadBody):
    _cleanup_expired()

    if not body.code.isdigit() or len(body.code) != 6:
        raise HTTPException(400, "Code must be 6 digits")
    if body.code in store:
        raise HTTPException(409, "Code already in use — please try again")
    if body.filesize > 100 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 100MB)")

    try:
        raw = base64.b64decode(body.encrypted_file)
    except Exception:
        raise HTTPException(400, "Invalid base64 in encrypted_file")

    try:
        result = cloudinary.uploader.upload(
            raw,
            public_id    = f"cryptsend/{body.code}",
            resource_type= "raw",
            overwrite    = False,
        )
    except Exception as e:
        raise HTTPException(500, f"Cloudinary upload failed: {e}")

    expires = datetime.utcnow() + timedelta(hours=24)
    store[body.code] = {
        "filename":              body.filename,
        "filesize":              body.filesize,
        "cloudinary_url":        result["secure_url"],
        "cloudinary_id":         result["public_id"],
        "wrapped_key":           body.wrapped_key,
        "private_key":           body.private_key,
        "public_key":            body.public_key,
        "delete_after_download": body.delete_after_download,
        "expires_at":            expires.isoformat(),
        "downloaded":            False,
    }

    return {"ok": True, "code": body.code, "expires_at": expires.isoformat()}


@app.get("/info/{code}")
def info(code: str):
    e = _get(code, consume=False)
    return {
        "filename":   e["filename"],
        "filesize":   e["filesize"],
        "expires_at": e["expires_at"],
    }


@app.get("/download/{code}")
async def download(code: str):
    e = _get(code, consume=True)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(e["cloudinary_url"])
            r.raise_for_status()
            raw = r.content
    except Exception as ex:
        raise HTTPException(502, f"Failed to fetch from storage: {ex}")

    return {
        "encrypted_file": base64.b64encode(raw).decode(),
        "wrapped_key":    e["wrapped_key"],
        "private_key":    e["private_key"],
        "public_key":     e["public_key"],
        "filename":       e["filename"],
        "filesize":       e["filesize"],
    }


@app.post("/delete_after_download/{code}")
def delete_after_dl(code: str):
    """Called by browser after user clicks download."""
    if code in store:
        _delete(code)
    return {"ok": True}


# ── Helpers ──────────────────────────────────────────────────────
def _get(code: str, consume: bool = True) -> dict:
    if code not in store:
        raise HTTPException(404, "Code not found or expired")
    e = store[code]
    if datetime.utcnow() > datetime.fromisoformat(e["expires_at"]):
        _delete(code)
        raise HTTPException(410, "This code has expired (24h limit)")
    if e["downloaded"]:
        raise HTTPException(410, "This file was already downloaded and deleted")
    if consume:
        e["downloaded"] = True  # mark immediately so double-click can't race
    return e


def _delete(code: str):
    e = store.pop(code, None)
    if e and e.get("cloudinary_id"):
        try:
            cloudinary.uploader.destroy(e["cloudinary_id"], resource_type="raw")
        except Exception:
            pass


def _cleanup_expired():
    now = datetime.utcnow()
    expired = [c for c, e in store.items()
               if now > datetime.fromisoformat(e["expires_at"])]
    for c in expired:
        _delete(c)


# ── Entry point ──────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
