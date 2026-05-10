// ── State ──
let selectedPlan = 'plus';
let currencies = [];

// ── Init: load data from API ──
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadStats(), loadCurrencies()]);
});

async function loadStats() {
    try {
        const res = await fetch('/gpt/stats');
        const data = await res.json();
        document.getElementById('stat-total').textContent = data.total.toLocaleString();
        document.getElementById('stat-team').textContent = data.team.toLocaleString();
        document.getElementById('stat-plus').textContent = data.plus.toLocaleString();
    } catch { /* silent */ }
}

async function loadCurrencies() {
    try {
        const res = await fetch('/gpt/currency');
        currencies = await res.json();
        renderCurrencyDropdown(currencies);
        // Select first by default
        const first = currencies.find(c => !c.separator);
        if (first) selectCurrency(first);
    } catch { /* silent */ }
}

function renderCurrencyDropdown(list) {
    const container = document.getElementById('currencyList');
    container.innerHTML = '';
    const selectable = list.filter(c => !c.separator);
    if (selectable.length === 0) {
        container.innerHTML = '<div class="search-dropdown-empty">No results found</div>';
        return;
    }
    list.forEach(c => {
        if (c.separator) {
            const divider = document.createElement('div');
            divider.className = 'search-dropdown-divider';
            container.appendChild(divider);
            return;
        }
        const item = document.createElement('div');
        item.className = 'search-dropdown-item';
        item.textContent = c.label;
        item.dataset.key = c.key;
        item.dataset.currency = c.currency;
        item.onclick = () => selectCurrency(c);
        if (c.key === document.getElementById('currencyCode').value) {
            item.classList.add('active');
        }
        container.appendChild(item);
    });
}

function selectCurrency(c) {
    document.getElementById('currencyCode').value = c.key;
    document.getElementById('currencySearch').value = c.label;
    closeCurrencyDropdown();
    // Update plan prices
    document.querySelectorAll('.plan-price').forEach(el => {
        el.textContent = `${c.currency} 0`;
    });
}

function openCurrencyDropdown() {
    const input = document.getElementById('currencySearch');
    input.select();
    document.getElementById('currencyList').classList.add('open');
    renderCurrencyDropdown(currencies);
}

function closeCurrencyDropdown() {
    document.getElementById('currencyList').classList.remove('open');
}

function filterCurrencies() {
    const query = document.getElementById('currencySearch').value.toLowerCase();
    if (query === '') {
        renderCurrencyDropdown(currencies);
    } else {
        const filtered = currencies.filter(c =>
            !c.separator && (c.label.toLowerCase().includes(query) || c.key.toLowerCase().includes(query))
        );
        renderCurrencyDropdown(filtered);
    }
    document.getElementById('currencyList').classList.add('open');
}

// Close dropdowns on click outside
document.addEventListener('click', (e) => {
    const currDd = document.getElementById('currencyDropdown');
    if (currDd && !currDd.contains(e.target)) closeCurrencyDropdown();
    const payDd = document.getElementById('paymentDropdown');
    if (payDd && !payDd.contains(e.target)) closePaymentDropdown();
    const proxyDd = document.getElementById('proxyDropdown');
    if (proxyDd && !proxyDd.contains(e.target)) closeProxyDropdown();
});

// ── Payment Method Dropdown ──
function togglePaymentDropdown() {
    document.getElementById('paymentList').classList.toggle('open');
}

function closePaymentDropdown() {
    document.getElementById('paymentList').classList.remove('open');
}

function selectPayment(value, label) {
    document.getElementById('paymentMethod').value = value;
    document.getElementById('paymentDisplay').textContent = label;
    closePaymentDropdown();
    // Update active state
    document.querySelectorAll('#paymentList .search-dropdown-item').forEach(el => {
        el.classList.toggle('active', el.dataset.value === value);
    });
}

// ── Proxy Dropdown ──
function toggleProxyDropdown() {
    document.getElementById('proxyList').classList.toggle('open');
}

function closeProxyDropdown() {
    document.getElementById('proxyList').classList.remove('open');
}

function selectProxy(value, label) {
    document.getElementById('proxyMode').value = value;
    document.getElementById('proxyDisplay').textContent = label;
    closeProxyDropdown();
    // Update active state
    document.querySelectorAll('#proxyList .search-dropdown-item').forEach(el => {
        el.classList.toggle('active', el.dataset.value === value);
    });
    // Show/hide manual proxy section
    const manualSection = document.getElementById('manualProxySection');
    if (value === 'manual') {
        manualSection.classList.remove('hidden');
        document.getElementById('manualProxyInput').focus();
    } else {
        manualSection.classList.add('hidden');
    }
}

// ── Plan Selection ──
function selectPlan(plan) {
    if (plan === 'team') return;

    selectedPlan = plan;
    const plusCard = document.getElementById('plan-plus');

    // Active: green
    plusCard.className = 'plan-card rounded-xl border-2 border-green-500/60 bg-green-500/10 p-5';
    plusCard.querySelector('.plan-icon').className = 'plan-icon w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0';
    plusCard.querySelector('.plan-icon svg').className = 'w-5 h-5 text-green-400';
    plusCard.querySelector('.plan-name').className = 'plan-name font-semibold text-green-300 text-sm';
    plusCard.querySelectorAll('.plan-desc').forEach(el => el.className = 'plan-desc text-xs text-green-400/60');
    plusCard.querySelector('.plan-price').className = 'text-xl font-bold text-green-300 plan-price';
}

// ── Main generate handler → POST /gpt/payment ──
async function generatePaymentLink() {
    const tokenRaw = document.getElementById('accessToken').value.trim();
    if (!tokenRaw) {
        showError('Please paste your accessToken or session JSON.');
        return;
    }

    // If JSON → extract accessToken, otherwise send raw
    let session = tokenRaw;
    try {
        const json = JSON.parse(tokenRaw);
        if (json.accessToken) {
            session = json.accessToken;
        } else {
            showError('JSON is valid but missing the "accessToken" field.');
            return;
        }
    } catch {
        // Not JSON — send as raw token
    }

    const currency = document.getElementById('currencyCode').value;
    const payMethod = document.getElementById('paymentMethod').value;
    const proxy = document.getElementById('proxyMode').value;
    const manualProxy = document.getElementById('manualProxyInput').value.trim();

    // Validate manual proxy
    if (proxy === 'manual' && !manualProxy) {
        showError('Please enter a proxy address (e.g. 192.168.1.1:8080)');
        return;
    }

    setLoading(true);
    hideResult();

    try {
        const res = await fetch('/gpt/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan: selectedPlan,
                payment: payMethod,
                currency: currency,
                session: session,
                proxy: proxy,
                manualProxy: manualProxy
            })
        });

        const data = await res.json();
        setLoading(false);

        if (data.success) {
            showSuccess(data.url);
            loadStats(); // refresh stats
        } else {
            showError(data.msg || 'Unknown error');
        }
    } catch (err) {
        setLoading(false);
        showError(err.message || 'Network error');
    }
}

// ── UI helpers ──
function setLoading(on) {
    document.getElementById('generateBtn').classList.toggle('hidden', on);
    document.getElementById('loadingState').classList.toggle('hidden', !on);
    document.getElementById('loadingState').classList.toggle('flex', on);
}

function hideResult() {
    document.getElementById('successBox').classList.add('hidden');
    document.getElementById('errorBox').classList.add('hidden');
}

function showSuccess(url) {
    document.getElementById('resultUrl').value = url;
    const box = document.getElementById('successBox');
    box.classList.remove('hidden');
    const inner = box.querySelector('.fade-in-up');
    inner.style.animation = 'none';
    inner.offsetHeight;
    inner.style.animation = '';
}

function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    const box = document.getElementById('errorBox');
    box.classList.remove('hidden');
    const inner = box.querySelector('.fade-in-up');
    inner.style.animation = 'none';
    inner.offsetHeight;
    inner.style.animation = '';
}

function copyLink() {
    const url = document.getElementById('resultUrl').value;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><span>Copied!</span>';
        btn.classList.replace('bg-green-600', 'bg-green-700');
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.replace('bg-green-700', 'bg-green-600');
        }, 2000);
    });
}

function openLink() {
    const url = document.getElementById('resultUrl').value;
    if (url) window.open(url, '_blank');
}
