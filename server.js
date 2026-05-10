const express = require('express');
const path = require('path');
const fs = require('fs');
const { ProxyAgent, fetch: undiciFetch } = require('undici');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Stats persistence ──
const STATS_FILE = path.join(__dirname, 'stats.json');
const DEFAULT_STATS = { total: 0, team: 0, plus: 0 };

function readStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
        }
    } catch { /* ignore */ }
    return { ...DEFAULT_STATS };
}

function writeStats(stats) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch { /* ignore */ }
}

// ── Currency data ──
const CURRENCIES = [
    { key: 'Indonesia', label: '🇮🇩 Indonesia — IDR', currency: 'IDR' },
    { key: 'Singapore', label: '🇸🇬 Singapore — SGD', currency: 'SGD' },
    { key: 'Malaysia', label: '🇲🇾 Malaysia — MYR', currency: 'MYR' },
    { key: 'Thailand', label: '🇹🇭 Thailand — THB', currency: 'THB' },
    { key: 'Vietnam', label: '🇻🇳 Vietnam — VND', currency: 'VND' },
    { key: 'Philippines', label: '🇵🇭 Philippines — PHP', currency: 'PHP' },
    { separator: true },
    { key: 'United States', label: '🇺🇸 United States — USD', currency: 'USD' },
    { key: 'United Kingdom', label: '🇬🇧 United Kingdom — GBP', currency: 'GBP' },
    { key: 'Canada', label: '🇨🇦 Canada — CAD', currency: 'CAD' },
    { key: 'Australia', label: '🇦🇺 Australia — AUD', currency: 'AUD' },
    { key: 'New Zealand', label: '🇳🇿 New Zealand — NZD', currency: 'NZD' },
    { separator: true },
    { key: 'Japan', label: '🇯🇵 Japan — JPY', currency: 'JPY' },
    { key: 'South Korea', label: '🇰🇷 South Korea — KRW', currency: 'KRW' },
    { key: 'China', label: '🇨🇳 China — CNY', currency: 'CNY' },
    { key: 'Hong Kong', label: '🇭🇰 Hong Kong — HKD', currency: 'HKD' },
    { key: 'Taiwan', label: '🇹🇼 Taiwan — TWD', currency: 'TWD' },
    { key: 'India', label: '🇮🇳 India — INR', currency: 'INR' },
    { separator: true },
    { key: 'Germany', label: '🇩🇪 Germany — EUR', currency: 'EUR' },
    { key: 'France', label: '🇫🇷 France — EUR', currency: 'EUR' },
    { key: 'Netherlands', label: '🇳🇱 Netherlands — EUR', currency: 'EUR' },
    { key: 'Italy', label: '🇮🇹 Italy — EUR', currency: 'EUR' },
    { key: 'Spain', label: '🇪🇸 Spain — EUR', currency: 'EUR' },
    { key: 'Portugal', label: '🇵🇹 Portugal — EUR', currency: 'EUR' },
    { key: 'Ireland', label: '🇮🇪 Ireland — EUR', currency: 'EUR' },
    { key: 'Belgium', label: '🇧🇪 Belgium — EUR', currency: 'EUR' },
    { key: 'Austria', label: '🇦🇹 Austria — EUR', currency: 'EUR' },
    { key: 'Switzerland', label: '🇨🇭 Switzerland — CHF', currency: 'CHF' },
    { key: 'Sweden', label: '🇸🇪 Sweden — SEK', currency: 'SEK' },
    { key: 'Norway', label: '🇳🇴 Norway — NOK', currency: 'NOK' },
    { key: 'Denmark', label: '🇩🇰 Denmark — DKK', currency: 'DKK' },
    { key: 'Finland', label: '🇫🇮 Finland — EUR', currency: 'EUR' },
    { key: 'Poland', label: '🇵🇱 Poland — PLN', currency: 'PLN' },
    { key: 'Czech Republic', label: '🇨🇿 Czech Republic — CZK', currency: 'CZK' },
    { key: 'Romania', label: '🇷🇴 Romania — RON', currency: 'RON' },
    { key: 'Hungary', label: '🇭🇺 Hungary — HUF', currency: 'HUF' },
    { separator: true },
    { key: 'Brazil', label: '🇧🇷 Brazil — BRL', currency: 'BRL' },
    { key: 'Mexico', label: '🇲🇽 Mexico — MXN', currency: 'MXN' },
    { key: 'Argentina', label: '🇦🇷 Argentina — ARS', currency: 'ARS' },
    { key: 'Colombia', label: '🇨🇴 Colombia — COP', currency: 'COP' },
    { key: 'Chile', label: '🇨🇱 Chile — CLP', currency: 'CLP' },
    { separator: true },
    { key: 'South Africa', label: '🇿🇦 South Africa — ZAR', currency: 'ZAR' },
    { key: 'Nigeria', label: '🇳🇬 Nigeria — NGN', currency: 'NGN' },
    { key: 'Kenya', label: '🇰🇪 Kenya — KES', currency: 'KES' },
    { separator: true },
    { key: 'United Arab Emirates', label: '🇦🇪 United Arab Emirates — AED', currency: 'AED' },
    { key: 'Saudi Arabia', label: '🇸🇦 Saudi Arabia — SAR', currency: 'SAR' },
    { key: 'Israel', label: '🇮🇱 Israel — ILS', currency: 'ILS' },
    { key: 'Turkey', label: '🇹🇷 Turkey — TRY', currency: 'TRY' },
    { key: 'Pakistan', label: '🇵🇰 Pakistan — PKR', currency: 'PKR' },
    { key: 'Bangladesh', label: '🇧🇩 Bangladesh — BDT', currency: 'BDT' },
];

// Country key to ISO country code mapping for ChatGPT API
const COUNTRY_TO_CODE = {
    'Indonesia': 'ID',
    'Singapore': 'SG',
    'Malaysia': 'MY',
    'Thailand': 'TH',
    'Vietnam': 'VN',
    'Philippines': 'PH',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'New Zealand': 'NZ',
    'Japan': 'JP',
    'South Korea': 'KR',
    'China': 'CN',
    'Hong Kong': 'HK',
    'Taiwan': 'TW',
    'India': 'IN',
    'Germany': 'DE',
    'France': 'FR',
    'Netherlands': 'NL',
    'Italy': 'IT',
    'Spain': 'ES',
    'Portugal': 'PT',
    'Ireland': 'IE',
    'Belgium': 'BE',
    'Austria': 'AT',
    'Switzerland': 'CH',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Poland': 'PL',
    'Czech Republic': 'CZ',
    'Romania': 'RO',
    'Hungary': 'HU',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Argentina': 'AR',
    'Colombia': 'CO',
    'Chile': 'CL',
    'South Africa': 'ZA',
    'Nigeria': 'NG',
    'Kenya': 'KE',
    'United Arab Emirates': 'AE',
    'Saudi Arabia': 'SA',
    'Israel': 'IL',
    'Turkey': 'TR',
    'Pakistan': 'PK',
    'Bangladesh': 'BD',
};

// ── Proxy configuration ──

// Make a fetch request through a proxy
async function fetchWithProxy(url, options, proxyUrl) {
    if (proxyUrl) {
        const dispatcher = new ProxyAgent(proxyUrl);
        return undiciFetch(url, { ...options, dispatcher });
    }
    return fetch(url, options);
}

// Try to make the checkout request, optionally with proxy
async function makeCheckoutRequest(requestBody, session, proxyMode, manualProxy) {
    const fetchOptions = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session}`,
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'oai-language': 'en-US',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(requestBody),
    };

    const targetUrl = 'https://chatgpt.com/backend-api/payments/checkout';

    // No proxy — direct request
    if (proxyMode === 'none') {
        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.json();
        return { response, data, proxyUsed: 'Direct (no proxy)' };
    }

    // Manual proxy
    if (proxyMode === 'manual') {
        if (!manualProxy) {
            throw new Error('Manual proxy URL is required but not provided.');
        }
        const proxyUrl = manualProxy.includes('://') ? manualProxy : `http://${manualProxy}`;
        console.log(`[Proxy] Using manual proxy: ${proxyUrl}`);
        const response = await fetchWithProxy(targetUrl, fetchOptions, proxyUrl);
        const data = await response.json();
        return { response, data, proxyUsed: proxyUrl };
    }

    throw new Error(`Unknown proxy mode: ${proxyMode}`);
}

// ── API: Stats ──
app.get('/gpt/stats', (req, res) => {
    const stats = readStats();
    res.json(stats);
});

// ── API: Currency list ──
app.get('/gpt/currency', (req, res) => {
    res.json(CURRENCIES);
});

// ── API: Generate payment link ──
app.post('/gpt/payment', async (req, res) => {
    try {
        const { plan, payment, currency, session, proxy, manualProxy } = req.body;

        if (!session) {
            return res.json({ success: false, msg: 'Missing access token / session.' });
        }

        const countryCode = COUNTRY_TO_CODE[currency] || 'US';
        const currencyInfo = CURRENCIES.find(c => c.key === currency && !c.separator);
        const currencyCode = currencyInfo ? currencyInfo.currency : 'USD';

        let requestBody;
        let checkoutUiMode;

        if (plan === 'plus') {
            // Plus plan
            if (payment === 'shortlink') {
                // Direct Checkout — returns checkout_session_id, we construct short URL
                checkoutUiMode = 'custom';
            } else {
                // Stripe Hosted — returns full Stripe URL
                checkoutUiMode = 'hosted';
            }

            requestBody = {
                plan_type: 'plus',
                checkout_ui_mode: checkoutUiMode,
                billing_details: {
                    country: countryCode,
                    currency: currencyCode,
                },
                cancel_url: 'https://chatgpt.com/#pricing',
                promo_campaign: {
                    promo_campaign_id: 'plus-1-month-free',
                    is_coupon_from_query_param: false,
                },
                success_url: 'https://chatgpt.com/',
            };
        } else if (plan === 'team') {
            // Team/Business plan
            if (payment === 'shortlink') {
                checkoutUiMode = 'custom';
            } else {
                checkoutUiMode = 'redirect';
            }

            requestBody = {
                plan_name: 'chatgptteamplan',
                team_plan_data: {
                    workspace_name: 'MyTeam',
                    price_interval: 'month',
                    seat_quantity: 5,
                },
                billing_details: {
                    country: countryCode,
                    currency: currencyCode,
                },
                cancel_url: 'https://chatgpt.com/?numSeats=5&selectedPlan=month&referrer=https%3A%2F%2Fauth.openai.com%2F#team-pricing-seat-selection',
                promo_campaign: {
                    promo_campaign_id: 'team-1-month-free',
                    is_coupon_from_query_param: true,
                },
                checkout_ui_mode: checkoutUiMode,
            };
        } else {
            return res.json({ success: false, msg: 'Invalid plan selected.' });
        }

        const proxyMode = proxy || 'none';

        // Call ChatGPT's checkout API (with proxy support)
        const { response, data, proxyUsed } = await makeCheckoutRequest(requestBody, session, proxyMode, manualProxy);
        console.log(`[Payment] Proxy used: ${proxyUsed}`);

        if (!response.ok) {
            const errMsg = data.detail || data.message || data.error || `ChatGPT API returned status ${response.status}`;
            return res.json({ success: false, msg: errMsg });
        }

        // Determine the checkout URL
        let checkoutUrl;

        if (payment === 'shortlink') {
            // Shortlink: construct URL from checkout_session_id
            if (data.checkout_session_id) {
                checkoutUrl = `https://chatgpt.com/checkout/openai_llc/${data.checkout_session_id}`;
            } else if (data.url) {
                checkoutUrl = data.url;
            } else {
                return res.json({ success: false, msg: 'No checkout session ID or URL returned from ChatGPT API.' });
            }
        } else {
            // Longlink: use the full Stripe URL directly
            if (data.url) {
                checkoutUrl = data.url;
            } else if (data.checkout_session_id) {
                checkoutUrl = `https://chatgpt.com/checkout/openai_llc/${data.checkout_session_id}`;
            } else {
                return res.json({ success: false, msg: 'No checkout URL returned from ChatGPT API.' });
            }
        }

        // Update stats
        const stats = readStats();
        stats.total += 1;
        if (plan === 'team') stats.team += 1;
        else stats.plus += 1;
        writeStats(stats);

        res.json({ success: true, url: checkoutUrl });
    } catch (err) {
        console.error('Payment generation error:', err);
        res.json({ success: false, msg: err.message || 'Server error occurred.' });
    }
});

// ── Start server ──
app.listen(PORT, () => {
    console.log(`GPT Checkout Generator running on http://localhost:${PORT}`);
});
