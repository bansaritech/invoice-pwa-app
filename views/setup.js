import * as store from '../lib/store.js';
import * as sync from '../lib/sync.js';

let step = 0;
const STEPS = 3;

export function render(root) {
  step = 0;
  root.innerHTML = `
  <div style="min-height:100vh;display:flex;flex-direction:column;max-width:520px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:12px;padding:20px 22px">
      <div class="wordmark"><span class="mark">₹</span> Ledger</div><span style="flex:1"></span>
      <button class="iconbtn" aria-label="Toggle theme" onclick="toggleTheme()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-theme-icon></svg></button>
    </div>
    <div id="bars" style="display:flex;gap:8px;padding:0 22px 8px"></div>
    <main style="flex:1;padding:14px 22px 30px">
      <section class="setup-step" data-step="0">
        <div class="eyebrow">Step 1 of 3</div><h1 style="font-size:clamp(24px,6vw,30px);letter-spacing:-.03em;margin:6px 0 4px;font-weight:800">Your business</h1>
        <p style="color:var(--ink-2);font-size:14px;margin-bottom:22px">Appears on every invoice you send.</p>
        <label class="field"><span class="lab">Business name</span><input class="input" id="s-name" placeholder="e.g. Bansari Tech" /></label>
        <label class="field"><span class="lab">GSTIN <span style="color:var(--ink-3);font-weight:500">(optional)</span></span><input class="input num" id="s-gstin" placeholder="24AABCB1234Z1Z5" /></label>
        <label class="field" style="margin:0"><span class="lab">Address</span><textarea class="input" id="s-addr" placeholder="Billing address…"></textarea></label>
      </section>
      <section class="setup-step" data-step="1" style="display:none">
        <div class="eyebrow">Step 2 of 3</div><h1 style="font-size:clamp(24px,6vw,30px);letter-spacing:-.03em;margin:6px 0 4px;font-weight:800">Tax & invoicing</h1>
        <p style="color:var(--ink-2);font-size:14px;margin-bottom:22px">Defaults — change these anytime in Settings.</p>
        <div class="grid-2">
          <label class="field"><span class="lab">Tax label</span><select class="input" id="s-taxlabel"><option>GST</option><option>VAT</option><option>TAX</option><option>Sales Tax</option></select></label>
          <label class="field"><span class="lab">Default rate %</span><input class="input num" id="s-taxrate" value="18" /></label>
        </div>
        <label class="field"><span class="lab">Tax applied on</span><select class="input" id="s-taxmode"><option value="invoice">Whole invoice</option><option value="item">Each item</option></select></label>
        <label class="field" style="margin:0"><span class="lab">Currency</span><select class="input" id="s-cur"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option></select></label>
      </section>
      <section class="setup-step" data-step="2" style="display:none">
        <div class="eyebrow">Step 3 of 3</div><h1 style="font-size:clamp(24px,6vw,30px);letter-spacing:-.03em;margin:6px 0 4px;font-weight:800">Connect your data</h1>
        <p style="color:var(--ink-2);font-size:14px;margin-bottom:22px">Your invoices live in a private GitHub repo you control. The token is encrypted on this device.</p>
        <label class="field"><span class="lab">Repository</span><input class="input num" id="s-repo" placeholder="owner/repository" /></label>
        <div class="grid-2"><label class="field"><span class="lab">Branch</span><input class="input num" id="s-branch" value="main" /></label><label class="field"><span class="lab">Access token</span><input class="input" id="s-token" type="password" placeholder="ghp_…" /></label></div>
        <p id="s-err" style="color:var(--over);font-size:13px;margin:4px 0 0;display:none"></p>
        <div class="card card-pad" style="display:flex;gap:12px;align-items:flex-start;background:color-mix(in srgb,var(--primary) 6%,transparent);border-color:color-mix(in srgb,var(--primary) 25%,transparent)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div style="font-size:12.5px;color:var(--ink-2)">Use a fine-grained token with <b>Contents: Read &amp; write</b>. It's encrypted with a non-extractable key and never shown again.</div>
        </div>
      </section>
    </main>
    <div style="display:flex;gap:10px;padding:16px 22px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line)">
      <button class="btn btn-ghost" id="back" style="display:none;flex:1;justify-content:center;height:48px">Back</button>
      <button class="btn btn-primary" id="next" style="flex:1;justify-content:center;height:48px">Continue</button>
    </div>
  </div>`;

  paintBars(root);
  root.querySelector('#back').addEventListener('click', () => { if (step > 0) { step--; show(root); } });
  root.querySelector('#next').addEventListener('click', () => onNext(root));
  show(root);
}

function paintBars(root) {
  root.querySelector('#bars').innerHTML = Array.from({ length: STEPS }, (_, i) =>
    `<span style="flex:1;height:4px;border-radius:4px;background:${i <= step ? 'var(--primary)' : 'var(--line-2)'}"></span>`).join('');
}
function show(root) {
  root.querySelectorAll('.setup-step').forEach((s) => s.style.display = +s.dataset.step === step ? '' : 'none');
  root.querySelector('#back').style.display = step === 0 ? 'none' : '';
  root.querySelector('#next').textContent = step === STEPS - 1 ? 'Finish setup' : 'Continue';
  paintBars(root);
}

async function onNext(root) {
  if (step < STEPS - 1) { step++; show(root); return; }
  const repo = root.querySelector('#s-repo').value.trim();
  const branch = root.querySelector('#s-branch').value.trim();
  const token = root.querySelector('#s-token').value.trim();
  const err = root.querySelector('#s-err');
  if (!/^[^/]+\/[^/]+$/.test(repo) || !branch || !token) {
    err.textContent = 'Enter a repository (owner/name), branch, and access token to continue.';
    err.style.display = '';
    return;
  }
  // Save business + invoicing defaults.
  const s = JSON.parse(JSON.stringify(store.settings()));
  s.business.name = root.querySelector('#s-name').value.trim() || s.business.name;
  s.business.gstin = root.querySelector('#s-gstin').value.trim();
  s.business.address = root.querySelector('#s-addr').value.trim();
  s.invoicing.taxLabel = root.querySelector('#s-taxlabel').value;
  s.invoicing.defaultTax = { type: 'pct', value: +root.querySelector('#s-taxrate').value || 0 };
  s.invoicing.taxMode = root.querySelector('#s-taxmode').value;
  s.invoicing.defaultCurrency = root.querySelector('#s-cur').value;
  const btn = root.querySelector('#next');
  btn.disabled = true; btn.textContent = 'Connecting…';
  store.saveSettings(s);
  await store.connect({ repo, branch, token }); // marks connected + emits
  try { await sync.initialSync(); } catch (e) { console.error(e); }
  location.hash = '#/';
}
