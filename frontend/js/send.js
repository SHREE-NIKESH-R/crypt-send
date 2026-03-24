/**
 * CryptSend — Send Page
 * Step 1: Generate Keys
 * Step 2: Select File
 * Step 3: Encrypt
 * Step 4: Send → Get Code
 */

// ── CONFIG ── Change this to your deployed backend URL ──────────
const API = "https://crypt-send.onrender.com";
// For local testing use: const API = 'http://localhost:8000';

// ── STATE ────────────────────────────────────────────────────────
let rsaPub = null,
  rsaPriv = null,
  pubB64 = "",
  privB64 = "";
let selectedFile = null;
let encryptedPayload = null; // { encB64, wrappedKey }

// ── HELPERS ──────────────────────────────────────────────────────
function setProgress(fillId, lblId, pctId, pct, label, state) {
    const fill = document.getElementById(fillId);
    const lbl = document.getElementById(lblId);
    const pctEl = document.getElementById(pctId);
    fill.style.width = pct + "%";
    lbl.textContent = label;
    pctEl.textContent = pct + "%";
    fill.className =
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
    p.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function donePanel(n, msg) {
    const p = document.getElementById("panel" + n);
    p.classList.remove("active");
    p.classList.add("done");
    document.getElementById("badge" + n).textContent = "✓ Done";
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function readBuf(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target.result);
      r.onerror = rej;
      r.readAsArrayBuffer(file);
    });
}

// ── STEP 1: GENERATE KEYS ────────────────────────────────────────
document.getElementById("btnGenKeys").addEventListener("click", async () => {
  const btn = document.getElementById("btnGenKeys");
  btn.disabled = true;
  btn.textContent = "⏳ Generating...";
  showProg("prog1");

  try {
    setProgress(
      "fill1",
      "lbl1",
      "pct1",
      10,
      "Initializing Web Crypto API...",
      "",
    );
    addLog("log1", "inf", "Starting RSA-2048 key generation...");
    await sleep(300);

    setProgress(
      "fill1",
      "lbl1",
      "pct1",
      35,
      "Generating RSA-2048 keypair...",
      "",
    );
    addLog("log1", "inf", "Generating key pair (this may take a moment)...");

    const kp = await Crypto.genRSA();
    rsaPub = kp.publicKey;
    rsaPriv = kp.privateKey;

    setProgress("fill1", "lbl1", "pct1", 65, "Exporting keys...", "");
    addLog("log1", "ok", "RSA keypair generated");

    pubB64 = await Crypto.exportPub(rsaPub);
    privB64 = await Crypto.exportPriv(rsaPriv);

    setProgress("fill1", "lbl1", "pct1", 85, "Preparing key preview...", "");
    addLog("log1", "ok", "Keys exported successfully");

    // Show key preview (truncated)
    document.getElementById("pubKeyBox").textContent =
      pubB64.slice(0, 80) + "...";
    document.getElementById("privKeyBox").textContent =
      privB64.slice(0, 80) + "...";
    document.getElementById("keyResult").style.display = "block";

    setProgress("fill1", "lbl1", "pct1", 100, "Keys ready!", "done");
    addLog("log1", "ok", "Public key: " + pubB64.slice(0, 16) + "...");
    addLog("log1", "ok", "Private key secured in memory");
    setStatus("st1", "ok", "✓ RSA-2048 keypair generated successfully");

    donePanel(1);
    unlockPanel(2);
    btn.textContent = "✓ Keys Generated";
  } catch (e) {
    setProgress("fill1", "lbl1", "pct1", 100, "Error!", "error");
    addLog("log1", "err", e.message);
    setStatus("st1", "err", "✗ Key generation failed: " + e.message);
    btn.disabled = false;
    btn.textContent = "🔑 Generate RSA-2048 Keys";
  }
});

// ── STEP 2: SELECT FILE ──────────────────────────────────────────
const dz = document.getElementById("dropzone");
const fi = document.getElementById("fileInput");

dz.addEventListener("click", () => fi.click());
fi.addEventListener("change", (e) => handleFile(e.target.files[0]));
dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("over");
});
dz.addEventListener("dragleave", () => dz.classList.remove("over"));
dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("over");
    handleFile(e.dataTransfer.files[0]);
});
document.getElementById("btnRemove").addEventListener("click", clearFile);

function handleFile(file) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setStatus("st2", "err", "✗ File too large. Maximum is 100MB.");
      return;
    }
    selectedFile = file;
    document.getElementById("fpIco").textContent = Crypto.fileIcon(file.name);
    document.getElementById("fpName").textContent = file.name;
    document.getElementById("fpSize").textContent = Crypto.fmtSize(file.size);
    document.getElementById("filePreview").classList.add("show");
    document.getElementById("st2").className = "status";

    // Unlock step 3
    const p3 = document.getElementById("panel3");
    p3.classList.remove("locked");
    p3.classList.add("active");
    document.getElementById("badge3").textContent = "Active";
    document.getElementById("btnEncrypt").disabled = false;
    donePanel(2);
    document.getElementById("badge2").textContent = "✓ Done";
}

function clearFile() {
    selectedFile = null;
    fi.value = "";
    document.getElementById("filePreview").classList.remove("show");
    const p3 = document.getElementById("panel3");
    p3.classList.remove("active");
    p3.classList.add("locked");
    document.getElementById("badge3").textContent = "Locked";
    document.getElementById("btnEncrypt").disabled = true;
    document.getElementById("panel2").classList.remove("done");
    document.getElementById("badge2").textContent = "Active";
}

// ── STEP 3: ENCRYPT ──────────────────────────────────────────────
document.getElementById("btnEncrypt").addEventListener("click", async () => {
  const btn = document.getElementById("btnEncrypt");
  btn.disabled = true;
  btn.textContent = "⏳ Encrypting...";
  showProg("prog3");

  try {
    setProgress("fill3", "lbl3", "pct3", 10, "Reading file...", "");
    addLog(
      "log3",
      "inf",
      `Reading "${selectedFile.name}" (${Crypto.fmtSize(selectedFile.size)})`,
    );
    const buf = await readBuf(selectedFile);

    setProgress(
      "fill3",
      "lbl3",
      "pct3",
      28,
      "Generating AES-256-GCM key...",
      "",
    );
    addLog("log3", "inf", "Generating random AES-256-GCM key...");
    await sleep(200);
    const aesKey = await Crypto.genAES();
    addLog("log3", "ok", "AES-256 key generated");

    setProgress(
      "fill3",
      "lbl3",
      "pct3",
      50,
      "Encrypting file with AES-256-GCM...",
      "",
    );
    addLog("log3", "inf", "Encrypting file locally in browser...");
    const encBytes = await Crypto.encryptFile(buf, aesKey);
    addLog("log3", "ok", `Encrypted: ${Crypto.fmtSize(encBytes.byteLength)}`);

    setProgress(
      "fill3",
      "lbl3",
      "pct3",
      75,
      "Wrapping AES key with RSA-2048...",
      "",
    );
    addLog("log3", "inf", "Sealing AES key with RSA-OAEP-2048...");
    const wrappedKey = await Crypto.wrapAES(aesKey, rsaPub);
    addLog("log3", "ok", "AES key sealed: " + wrappedKey.slice(0, 16) + "...");

    setProgress("fill3", "lbl3", "pct3", 95, "Finalizing...", "");
    await sleep(200);
    setProgress("fill3", "lbl3", "pct3", 100, "Encryption complete!", "done");
    addLog("log3", "ok", "File encrypted successfully — plaintext is gone");
    setStatus("st3", "ok", "✓ File encrypted. Ready to send.");

    encryptedPayload = { encB64: Crypto.b64(encBytes), wrappedKey };

    donePanel(3);
    unlockPanel(4);
    document.getElementById("btnSend").disabled = false;
    btn.textContent = "✓ Encrypted";
  } catch (e) {
    setProgress("fill3", "lbl3", "pct3", 100, "Error!", "error");
    addLog("log3", "err", e.message);
    setStatus("st3", "err", "✗ Encryption failed: " + e.message);
    btn.disabled = false;
    btn.textContent = "🔒 Encrypt File";
  }
});

// ── STEP 4: SEND ─────────────────────────────────────────────────
document.getElementById("btnSend").addEventListener("click", async () => {
  const btn = document.getElementById("btnSend");
  btn.disabled = true;
  btn.textContent = "⏳ Uploading...";
  showProg("prog4");

  try {
    const code = Crypto.randCode();

    setProgress("fill4", "lbl4", "pct4", 15, "Preparing payload...", "");
    addLog("log4", "inf", "Preparing encrypted payload...");
    await sleep(200);

    setProgress("fill4", "lbl4", "pct4", 35, "Connecting to server...", "");
    addLog("log4", "inf", "Uploading to CryptSend server...");

    const payload = {
      code,
      encrypted_file: encryptedPayload.encB64,
      wrapped_key: encryptedPayload.wrappedKey,
      private_key: privB64, // stored server-side so receiver only needs the code
      public_key: pubB64,
      filename: selectedFile.name,
      filesize: selectedFile.size,
      delete_after_download: document.getElementById("chkDelete").checked,
    };

    setProgress("fill4", "lbl4", "pct4", 55, "Uploading encrypted file...", "");
    const res = await fetch(`${API}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Upload failed");
    }

    setProgress("fill4", "lbl4", "pct4", 80, "Saving metadata...", "");
    addLog("log4", "ok", "File uploaded to cloud storage");
    await sleep(300);

    setProgress("fill4", "lbl4", "pct4", 100, "Done!", "done");
    addLog("log4", "ok", "Code: " + code + " — expires 24h or after download");
    setStatus("st4", "ok", "✓ Sent! Share the code below.");

    donePanel(4);
    showCode(code, payload.delete_after_download);

    if (document.getElementById("chkQR").checked) showQR(code);
  } catch (e) {
    setProgress("fill4", "lbl4", "pct4", 100, "Error!", "error");
    addLog("log4", "err", e.message);
    setStatus("st4", "err", "✗ Upload failed: " + e.message);
    btn.disabled = false;
    btn.textContent = "↑ Upload & Get Code";
  }
});

function showCode(code, deleteAfter) {
    const rev = document.getElementById("codeReveal");
    rev.classList.add("show");
    const digs = document.getElementById("codeDigits");
    digs.innerHTML = "";
    code.split("").forEach((d, i) => {
      const el = document.createElement("div");
      el.className = "code-d";
      el.style.setProperty("--di", i * 0.07 + "s");
      el.textContent = d;
      digs.appendChild(el);
    });
    const exp = new Date(Date.now() + 86400000);
    document.getElementById("codeExpire").textContent =
      `⏱ Expires ${exp.toLocaleString()}` +
      (deleteAfter
        ? " · 🗑 Deleted after first download"
        : " · ♻ Multiple downloads allowed");
}

document.getElementById("btnCopyCode").addEventListener("click", () => {
    const code = Array.from(document.querySelectorAll(".code-d"))
      .map((e) => e.textContent)
      .join("");
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById("btnCopyCode");
      btn.textContent = "✅ Copied!";
      setTimeout(() => (btn.textContent = "📋 Copy Code"), 2000);
    });
});

document
  .getElementById("btnSendAnother")
  .addEventListener("click", () => location.reload());

function showQR(code) {
  const wrap = document.getElementById("qrWrap");
  wrap.classList.add("show");
  const container = document.getElementById("qrContainer");
  container.innerHTML = "";
  const url = `${location.origin}/receive.html?code=${code}`;
  try {
    new QRCode(container, {
      text: url,
      width: 160,
      height: 160,
      colorDark: "#1c1508",
      colorLight: "#f6f1e7",
      correctLevel: QRCode.CorrectLevel.M,
    });
    const qrNode = container.firstElementChild;
    if (qrNode) {
      qrNode.style.margin = "0 auto";
    }
  } catch (e) {
    container.textContent = "QR: " + code;
  }
}