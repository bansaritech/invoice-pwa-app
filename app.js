const $ = (selector) => document.querySelector(selector);
let data;
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

async function loadData() {
  const saved = localStorage.getItem('invoice-simple-data');
  data = saved ? JSON.parse(saved) : await fetch('data.json').then((r) => r.json());
  renderLists(); renderDatalists();
}
function saveData() { localStorage.setItem('invoice-simple-data', JSON.stringify(data)); renderLists(); renderDatalists(); }
function renderDatalists() {
  $('#parties').innerHTML = data.parties.map((party) => `<option value="${escapeHtml(party)}">`).join('');
  document.querySelectorAll('#items').forEach((list) => list.innerHTML = data.items.map((item) => `<option value="${escapeHtml(item.name)}">`).join(''));
}
function renderLists() {
  $('#partyList').innerHTML = data.parties.map((party, i) => `<li class="flex items-center justify-between py-2 text-sm"><span>${escapeHtml(party)}</span><button data-party="${i}" class="remove-party text-red-600">Remove</button></li>`).join('');
  $('#itemList').innerHTML = data.items.map((item, i) => `<li class="flex items-center justify-between py-2 text-sm"><span>${escapeHtml(item.name)} <span class="text-slate-500">${currency.format(item.rate)}</span></span><button data-item="${i}" class="remove-item text-red-600">Remove</button></li>`).join('');
}
function escapeHtml(value) { const el = document.createElement('div'); el.textContent = value; return el.innerHTML; }
function addLine(item = {}) {
  const row = $('#lineTemplate').content.cloneNode(true);
  row.querySelector('.item-name').value = item.name || ''; row.querySelector('.rate').value = item.rate || '';
  $('#lineItems').append(row); renderDatalists(); updateTotals();
}
function updateTotals() {
  let total = 0; document.querySelectorAll('#lineItems tr').forEach((row) => { const amount = (+row.querySelector('.quantity').value || 0) * (+row.querySelector('.rate').value || 0); row.querySelector('.amount').textContent = currency.format(amount); total += amount; });
  $('#subtotal').textContent = currency.format(total); $('#grandTotal').textContent = currency.format(total);
}
function setView(view) { $('#invoiceView').classList.toggle('hidden', view !== 'invoice'); $('#settingsView').classList.toggle('hidden', view !== 'settings'); }

document.addEventListener('click', async (event) => {
  const target = event.target;
  if (target.dataset.view) setView(target.dataset.view);
  if (target.id === 'addLine') addLine();
  if (target.classList.contains('remove-line')) { target.closest('tr').remove(); updateTotals(); }
  if (target.classList.contains('remove-party')) { data.parties.splice(+target.dataset.party, 1); saveData(); }
  if (target.classList.contains('remove-item')) { data.items.splice(+target.dataset.item, 1); saveData(); }
  if (target.id === 'newInvoice') { $('#partyInput').value = ''; $('#notes').value = ''; $('#lineItems').innerHTML = ''; addLine(); }
  if (target.id === 'printInvoice') window.print();
  if (target.id === 'commitChanges') await commitData();
});
document.addEventListener('input', (event) => { if (event.target.closest('#lineItems')) updateTotals(); });
document.addEventListener('change', (event) => { if (event.target.classList.contains('item-name')) { const item = data.items.find((x) => x.name === event.target.value); if (item) { event.target.closest('tr').querySelector('.rate').value = item.rate; updateTotals(); } } });
$('#partyForm').addEventListener('submit', (event) => { event.preventDefault(); const name = $('#newParty').value.trim(); if (name && !data.parties.includes(name)) { data.parties.push(name); data.parties.sort(); saveData(); } event.target.reset(); });
$('#itemForm').addEventListener('submit', (event) => { event.preventDefault(); const name = $('#newItem').value.trim(), rate = +$('#newRate').value; if (name && !data.items.some((x) => x.name === name)) { data.items.push({ name, rate }); data.items.sort((a,b) => a.name.localeCompare(b.name)); saveData(); } event.target.reset(); });
async function commitData() {
  const [repo, branch, token] = [$('#githubRepo').value.trim(), $('#githubBranch').value.trim(), $('#githubToken').value.trim()]; const status = $('#commitStatus');
  if (!/^[^/]+\/[^/]+$/.test(repo) || !branch || !token) { status.textContent = 'Enter repository, branch, and token.'; status.className = 'mt-3 text-sm text-red-700'; return; }
  status.textContent = 'Committing…'; status.className = 'mt-3 text-sm text-amber-900';
  try { const url = `https://api.github.com/repos/${repo}/contents/data.json`; const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }; const current = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers }); if (!current.ok) throw new Error('Could not read data.json. Check repository, branch, and token.'); const file = await current.json(); const payload = { message: 'Update invoice parties and items', content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2) + '\n'))), sha: file.sha, branch }; const response = await fetch(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error((await response.json()).message || 'Commit failed.'); status.textContent = 'Committed. GitHub Pages will reflect it after its next deployment.'; status.className = 'mt-3 text-sm text-green-700'; $('#githubToken').value = ''; } catch (error) { status.textContent = error.message; status.className = 'mt-3 text-sm text-red-700'; }
}
let installPrompt;
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; $('#installButton').classList.remove('hidden'); });
$('#installButton').addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installButton').classList.add('hidden'); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
$('#invoiceDate').value = new Date().toISOString().slice(0, 10);
await loadData(); addLine();
