/* consent-camera-upload.js
   Safe flow: ask for consent, capture one photo, upload to imgbb.
   Use only with explicit user consent and a visible privacy notice.
*/

const IMGBB_API_KEY = '4ac1b397804bf1e1ca66272c82de62e9'; // you provided this key

// Helper: show a simple consent modal (creates DOM elements)
function showConsentModal(onAllow, onDeny) {
  // create overlay
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 99999
  });

  // modal box
  const box = document.createElement('div');
  Object.assign(box.style, {
    width: '90%', maxWidth: '420px', background: '#fff', color: '#111',
    padding: '18px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    fontFamily: 'Inter, Arial, sans-serif'
  });

  box.innerHTML = `
    <h3 style="margin:0 0 8px 0">Security check</h3>
    <p style="margin:0 0 12px 0; color:#333">
      To help identify unauthorized access, we can take one photo using your camera.
      This will be uploaded to a secure service. Do you agree?
    </p>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
      <button id="denyBtn" style="padding:8px 12px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer">Deny</button>
      <button id="allowBtn" style="padding:8px 12px;border-radius:8px;border:0;background:#0b79ff;color:#fff;cursor:pointer">Allow</button>
    </div>
    <p style="font-size:12px;color:#666;margin-top:10px">By allowing, you consent to one photo capture and upload. See privacy policy.</p>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.querySelector('#denyBtn').onclick = () => {
    document.body.removeChild(overlay);
    if (typeof onDeny === 'function') onDeny();
  };
  overlay.querySelector('#allowBtn').onclick = () => {
    document.body.removeChild(overlay);
    if (typeof onAllow === 'function') onAllow();
  };
}

// Capture one photo (returns base64 image data URL) — uses the front camera when available
async function capturePhotoOnce() {
  // prefer front camera if available
  const constraints = { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  // create hidden video element
  const video = document.createElement('video');
  video.style.display = 'none';
  document.body.appendChild(video);
  video.srcObject = stream;
  video.play();

  // wait for video to be ready
  await new Promise(resolve => {
    if (video.readyState >= 2) return resolve();
    video.onloadeddata = () => resolve();
  });

  // capture a frame to canvas
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // stop tracks & cleanup
  stream.getTracks().forEach(t => t.stop());
  document.body.removeChild(video);

  // return base64 PNG data (without data prefix)
  const dataUrl = canvas.toDataURL('image/png'); // data:image/png;base64,...
  const base64 = dataUrl.split(',')[1];
  return base64;
}

// Upload to imgbb via fetch and FormData
async function uploadToImgbb(base64Image, name = 'mopi_capture') {
  const endpoint = 'https://api.imgbb.com/1/upload';
  // Build URL with API key
  const url = `${endpoint}?key=${encodeURIComponent(IMGBB_API_KEY)}`;
  const form = new FormData();
  form.append('image', base64Image);
  form.append('name', name);
  // Optionally set expiration (in seconds)
  // form.append('expiration', '3600'); // auto-delete after 1 hour

  const resp = await fetch(url, {
    method: 'POST',
    body: form
  });
  if (!resp.ok) throw new Error('Upload failed: ' + resp.status);
  return resp.json(); // JSON with info.data.url etc.
}

/*
 * Public function to call when an incorrect password is detected.
 * This will ask for consent, then (if allowed) capture image & upload.
 */
function onIncorrectPasswordAttempt() {
  // Show consent modal
  showConsentModal(async () => {
    try {
      // request camera & capture
      const base64 = await capturePhotoOnce();
      // upload
      const res = await uploadToImgbb(base64, 'unauth_attempt_' + Date.now());
      // handle success (show a small notification)
      alert('Security photo captured and uploaded (ID: ' + (res.data && res.data.id) + ').');
      // Optionally send the res.data.url to your server or log it
      // fetch('/api/report', {method:'POST', body: JSON.stringify({imageUrl: res.data.url, time:Date.now()})});
    } catch (err) {
      console.error('Capture/upload failed', err);
      alert('Failed to capture/upload photo: ' + (err.message || err));
    }
  }, () => {
    // denied: just show a message or increase lockout counters
    alert('Consent denied. The attempt has been logged locally.');
    // Optionally log locally or notify server of failed attempt
  });
}
