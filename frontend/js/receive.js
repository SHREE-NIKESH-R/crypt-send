/**
 * CryptSend — Receive Page
 * Step 1: Enter code → Fetch encrypted file
 * Step 2: Click Decrypt → RSA unwrap → AES decrypt
 * Step 3: Click Download → Server deletes file
 */

// ── CONFIG ── Change to your deployed backend URL ────────────────
const API = "https://crypt-send.onrender.com"
    // For local testing use: const API = 'http://localhost:8000';

// ── STATE ────────────────────────────────────────────────────────
let fetchedData = null; // { encrypted_file, wrapped_key, private_key, filename }
let decryptedBlob = null;
let decryptedFilename = "";

// ── HELPERS ──────────────────────────────────────────────────────
function setProgress(fillId, lblId, pctId, pct, label, state) {
    document.getElementById(fillId).style.width = pct + "%";
    document.getElementById(lblId).textContent = label;
    document.getElementById(pctId).textContent = pct + "%";
    document.getElementById(fillId).className =
      "prog-fill" +
      (state === "done" ? " done" : state === "error" ? " error" : "");
}

function showProg(id) {
    document.getElementById(id).classList.add("show");
}

function addLog(logId, type, msg) {
    const el = document.getElementById(logId);
    el.classList.add("show");
    const row = document.createElement("div");
    row.className = "log-line";
    const ts = new Date().toTimeString().slice(0, 8);
    const icons = { ok: "✓", inf: "›", err: "✗" };
    const cls = { ok: "log-ok", inf: "log-inf", err: "log-err" };
    row.innerHTML = `<span class="log-ts">[${ts}]</span><span class="${cls[type]}">${icons[type]}</span><span>${msg}</span>`;
    el.appendChild(row);
    el.scrollTop = el.scrollHeight;
}

function setStatus(id, type, msg) {
    const el = document.getElementById(id);
    el.className = `status ${type} show`;
    el.textContent = msg;
}

function unlockPanel(n) {
    const p = document.getElementById("panel" + n);
    p.classList.remove("locked");
    p.classList.add("active");
    document.getElementById("badge" + n).textContent = "Active";
    setTimeout(
      () => p.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      100,
    );
}

function donePanel(n) {
    const p = document.getElementById("panel" + n);
    p.classList.remove("active");
    p.classList.add("done");
    document.getElementById("badge" + n).textContent = "✓ Done";
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function getCode() {
    return Array.from(document.querySelectorAll(".ci"))
      .map((b) => b.value)
      .join("");
}

// ── CODE INPUT ───────────────────────────────────────────────────
const boxes = document.querySelectorAll(".ci");

boxes.forEach((box, i) => {
    box.addEventListener("input", (e) => {
      const val = e.target.value.replace(/\D/g, "");
      box.value = val.slice(-1);
      if (val && i < boxes.length - 1) boxes[i + 1].focus();
      if (box.value) box.classList.add("filled");
      else box.classList.remove("filled");
      checkCode();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        boxes[i - 1].focus();
        boxes[i - 1].value = "";
        boxes[i - 1].classList.remove("filled");
        checkCode();
      }
    });
    box.addEventListener("paste", (e) => {
      const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (t.length === 6) {
        boxes.forEach((b, idx) => {
          b.value = t[idx] || "";
          if (b.value) b.classList.add("filled");
          else b.classList.remove("filled");
        });
        checkCode();
        e.preventDefault();
      }
    });
});

document.getElementById("lnkPaste").addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    const t = await navigator.clipboard.readText();
    const d = t.replace(/\D/g, "").slice(0, 6);
    boxes.forEach((b, i) => {
      b.value = d[i] || "";
      if (b.value) b.classList.add("filled");
      else b.classList.remove("filled");
    });
    checkCode();
  } catch {
    setStatus(
      "st1",
      "info",
      "ℹ Paste the 6-digit code manually into the boxes.",
    );
  }
});

function checkCode() {
    const code = getCode();
    document.getElementById("btnFetch").disabled = code.length !== 6;
}

// Pre-fill from URL ?code=XXXXXX
window.addEventListener("DOMContentLoaded", () => {
    const p = new URLSearchParams(location.search);
    const c = p.get("code");
    if (c && /^\d{6}$/.test(c)) {
      boxes.forEach((b, i) => {
        b.value = c[i];
        b.classList.add("filled");
      });
      checkCode();
    }
});

// ── STEP 1: FETCH ────────────────────────────────────────────────
document.getElementById("btnFetch").addEventListener("click", async () => {
  const btn = document.getElementById("btnFetch");
  btn.disabled = true;
  btn.textContent = "⏳ Fetching...";
  showProg("prog1");

  const code = getCode();

  try {
    setProgress("fill1", "lbl1", "pct1", 15, "Connecting to server...", "");
    addLog("log1", "inf", `Looking up code: ${code}`);
    await sleep(200);

    setProgress("fill1", "lbl1", "pct1", 35, "Fetching file metadata...", "");

    // Fetch metadata first
    const metaRes = await fetch(`${API}/info/${code}`);
    if (!metaRes.ok) {
      const err = await metaRes
        .json()
        .catch(() => ({ detail: "Code not found or expired" }));
      throw new Error(err.detail);
    }
    const meta = await metaRes.json();
    addLog(
      "log1",
      "ok",
      `Found: "${meta.filename}" (${Crypto.fmtSize(meta.filesize)})`,
    );

    setProgress(
      "fill1",
      "lbl1",
      "pct1",
      60,
      "Downloading encrypted payload...",
      "",
    );
    addLog("log1", "inf", "Downloading encrypted file from cloud...");

    // Fetch full payload (server marks for deletion if delete_after_download)
    const dlRes = await fetch(`${API}/download/${code}`);
    if (!dlRes.ok) {
      const err = await dlRes
        .json()
        .catch(() => ({ detail: "Download failed" }));
      throw new Error(err.detail);
    }
    fetchedData = await dlRes.json();
    fetchedData.filename = meta.filename;
    fetchedData.filesize = meta.filesize;

    addLog(
      "log1",
      "ok",
      `Payload received — ${Crypto.fmtSize(meta.filesize)} (encrypted)`,
    );

    setProgress("fill1", "lbl1", "pct1", 90, "Verifying payload...", "");
    await sleep(200);
    setProgress("fill1", "lbl1", "pct1", 100, "Payload ready!", "done");
    addLog("log1", "ok", "Encrypted file in memory — ready to decrypt");

    // Show file info card
    document.getElementById("infoName").textContent = meta.filename;
    document.getElementById("infoSize").textContent = Crypto.fmtSize(
      meta.filesize,
    );
    document.getElementById("infoExp").textContent =
      `Expires: ${new Date(meta.expires_at).toLocaleString()}`;
    document.getElementById("fileInfoCard").style.display = "block";

    setStatus("st1", "ok", "✓ File fetched. Ready to decrypt.");
    donePanel(1);
    unlockPanel(2);
    document.getElementById("btnDecrypt").disabled = false;
    btn.textContent = "✓ Fetched";
  } catch (e) {
    setProgress("fill1", "lbl1", "pct1", 100, "Error!", "error");
    addLog("log1", "err", e.message);
    setStatus("st1", "err", "✗ " + e.message);
    btn.disabled = false;
    btn.textContent = "🔍 Fetch File Info";
  }
});

// ── STEP 2: DECRYPT ──────────────────────────────────────────────
document.getElementById("btnDecrypt").addEventListener("click", async () => {
  const btn = document.getElementById("btnDecrypt");
  btn.disabled = true;
  btn.textContent = "⏳ Decrypting...";
  showProg("prog2");

  try {
    setProgress(
      "fill2",
      "lbl2",
      "pct2",
      15,
      "Importing RSA private key...",
      "",
    );
    addLog("log2", "inf", "Importing RSA-2048 private key...");
    await sleep(200);

    const privKey = await Crypto.importPriv(fetchedData.private_key);
    addLog("log2", "ok", "Private key imported");

    setProgress(
      "fill2",
      "lbl2",
      "pct2",
      38,
      "Unwrapping AES key with RSA...",
      "",
    );
    addLog("log2", "inf", "Decrypting AES key with RSA-OAEP...");

    const aesKey = await Crypto.unwrapAES(fetchedData.wrapped_key, privKey);
    addLog("log2", "ok", "AES-256 key recovered successfully");

    setProgress(
      "fill2",
      "lbl2",
      "pct2",
      62,
      "Decrypting file with AES-256-GCM...",
      "",
    );
    addLog("log2", "inf", `Decrypting "${fetchedData.filename}"...`);

    const encBytes = new Uint8Array(Crypto.unb64(fetchedData.encrypted_file));
    const decBuf = await Crypto.decryptFile(encBytes, aesKey);
    addLog("log2", "ok", `Decrypted: ${Crypto.fmtSize(decBuf.byteLength)}`);

    setProgress("fill2", "lbl2", "pct2", 88, "Preparing download...", "");
    await sleep(200);

    decryptedBlob = new Blob([decBuf]);
    decryptedFilename = fetchedData.filename;

    setProgress("fill2", "lbl2", "pct2", 100, "Decryption complete!", "done");
    addLog(
      "log2",
      "ok",
      "🎉 File decrypted successfully — plaintext only in your browser",
    );
    setStatus("st2", "ok", "✓ Decrypted. Click Download below.");

    donePanel(2);
    unlockPanel(3);
    showDownload();
    btn.textContent = "✓ Decrypted";
  } catch (e) {
    setProgress("fill2", "lbl2", "pct2", 100, "Error!", "error");
    addLog("log2", "err", e.message);
    setStatus("st2", "err", "✗ Decryption failed: " + e.message);
    btn.disabled = false;
    btn.textContent = "🔓 Decrypt File";
  }
});

// ── STEP 3: DOWNLOAD ─────────────────────────────────────────────
function showDownload() {
  const url = URL.createObjectURL(decryptedBlob);
  const dl = document.getElementById("btnDownload");
  dl.href = url;
  dl.download = decryptedFilename;

  document.getElementById("dlName").textContent = decryptedFilename;
  document.getElementById("dlMeta").textContent =
    `${Crypto.fmtSize(decryptedBlob.size)} · Decrypted locally in your browser`;
  document.getElementById("dlReady").classList.add("show");

  // When user actually downloads, notify server to delete
  dl.addEventListener(
    "click",
    () => {
      setStatus(
        "st3",
        "ok",
        "✓ Downloading... Server will delete the file now.",
      );
      // Fire-and-forget delete notification
      fetch(`${API}/delete_after_download/${getCode()}`, {
        method: "POST",
      }).catch(() => {});
    },
    { once: true },
  );
}