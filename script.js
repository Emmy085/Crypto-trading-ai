// App State
const state = {
    // Auth
    isLoggedIn: false,
    currentUser: null,
    users: JSON.parse(localStorage.getItem('users')) || [],

    // Investment
    hasInvested: false,
    investedAmountNGN: 0,
    investedAmountUSD: 0,
    exchangeRate: 1500, // 1 USD = 1500 NGN
    minimumInvestment: 5000, // NGN

    // Trading
    balance: 0,
    selectedCoin: 'BTC',
    timeframe: '1m',
    walletConnected: false,
    walletAddress: null,

    // Prices
    prices: {
        BTC: 67234.56,
        ETH: 3456.78,
        SOL: 145.32,
        ADA: 0.4567,
        DOT: 7.89
    },

    // Holdings
    holdings: {
        BTC: 0,
        ETH: 0,
        SOL: 0,
        USDT: 0
    },

    chart: null,
    tradeType: 'buy',
    selectedPaymentMethod: 'usdt'
};

const coins = [
    { symbol: 'BTC', name: 'Bitcoin', price: 67234.56, change: 2.34, color: '#f7931a' },
    { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change: -1.23, color: '#627eea' },
    { symbol: 'SOL', name: 'Solana', price: 145.32, change: 5.67, color: '#00ffa3' },
    { symbol: 'ADA', name: 'Cardano', price: 0.4567, change: -0.89, color: '#0033ad' },
    { symbol: 'DOT', name: 'Polkadot', price: 7.89, change: 3.45, color: '#e6007a' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    if (state.isLoggedIn) {
        initApp();
    }
});

// Auth Functions
function checkAuthState() {
    const session = JSON.parse(localStorage.getItem('currentSession'));
    if (session && session.expires > Date.now()) {
        state.isLoggedIn = true;
        state.currentUser = session.user;
        loadUserData();
        showMainApp();
    } else {
        showAuthScreen();
    }
}

function loadUserData() {
    const userData = JSON.parse(localStorage.getItem(`user_${state.currentUser.email}`));
    if (userData) {
        state.hasInvested = userData.hasInvested || false;
        state.investedAmountNGN = userData.investedAmountNGN || 0;
        state.investedAmountUSD = userData.investedAmountUSD || 0;
        state.balance = userData.balance || 0;
        state.holdings = userData.holdings || { BTC: 0, ETH: 0, SOL: 0, USDT: 0 };
    }
}

function saveUserData() {
    if (state.currentUser) {
        const userData = {
            hasInvested: state.hasInvested,
            investedAmountNGN: state.investedAmountNGN,
            investedAmountUSD: state.investedAmountUSD,
            balance: state.balance,
            holdings: state.holdings
        };
        localStorage.setItem(`user_${state.currentUser.email}`, JSON.stringify(userData));
    }
}

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    updateUI();
}

function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    document.getElementById('resetForm').classList.add('hidden');
}

function showSignup() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    document.getElementById('resetForm').classList.add('hidden');
}

function showForgotPassword() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.remove('hidden');
    document.getElementById('resetForm').classList.add('hidden');
}

function showResetForm() {
    document.getElementById('forgotForm').classList.add('hidden');
    document.getElementById('resetForm').classList.remove('hidden');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
        showToast('❌', 'Please fill in all fields');
        return;
    }

    const user = state.users.find(u => u.email === email && u.password === password);

    if (!user) {
        showToast('❌', 'Invalid email or password');
        return;
    }

    state.isLoggedIn = true;
    state.currentUser = user;

    const session = {
        user: user,
        expires: rememberMe ? Date.now() + (30 * 24 * 60 * 60 * 1000) : Date.now() + (24 * 60 * 60 * 1000)
    };
    localStorage.setItem('currentSession', JSON.stringify(session));

    loadUserData();
    showMainApp();
    initApp();
    showToast('✅', 'Welcome back!');
}

function signup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    if (!name || !email || !phone || !password) {
        showToast('❌', 'Please fill in all fields');
        return;
    }

    if (password.length < 8) {
        showToast('❌', 'Password must be at least 8 characters');
        return;
    }

    if (password !== confirmPassword) {
        showToast('❌', 'Passwords do not match');
        return;
    }

    if (!agreeTerms) {
        showToast('❌', 'Please agree to the terms');
        return;
    }

    if (state.users.find(u => u.email === email)) {
        showToast('❌', 'Email already registered');
        return;
    }

    const newUser = {
        name,
        email,
        phone: '+234' + phone,
        password,
        createdAt: new Date().toISOString()
    };

    state.users.push(newUser);
    localStorage.setItem('users', JSON.stringify(state.users));

    // Auto login
    state.isLoggedIn = true;
    state.currentUser = newUser;

    const session = {
        user: newUser,
        expires: Date.now() + (24 * 60 * 60 * 1000)
    };
    localStorage.setItem('currentSession', JSON.stringify(session));

    showMainApp();
    showToast('✅', 'Account created successfully!');
}

function sendResetLink() {
    const email = document.getElementById('forgotEmail').value.trim();

    if (!email) {
        showToast('❌', 'Please enter your email');
        return;
    }

    const user = state.users.find(u => u.email === email);
    if (!user) {
        showToast('❌', 'Email not found');
        return;
    }

    // Simulate sending reset link
    showToast('✅', 'Reset link sent to your email');
    setTimeout(showResetForm, 1500);
}

function resetPassword() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewPassword').value;

    if (newPass.length < 8) {
        showToast('❌', 'Password must be at least 8 characters');
        return;
    }

    if (newPass !== confirmPass) {
        showToast('❌', 'Passwords do not match');
        return;
    }

    // Update password (in real app, this would be done via token verification)
    showToast('✅', 'Password reset successfully!');
    setTimeout(showLogin, 1500);
}

function logout() {
    state.isLoggedIn = false;
    state.currentUser = null;
    localStorage.removeItem('currentSession');
    showAuthScreen();
    showToast('✅', 'Logged out successfully');
}

// App Initialization
function initApp() {
    renderCoinSelector();
    initChart();
    updateUI();
    startPriceSimulation();
    generateOrderBook();
    generateRecentTrades();
    updateAIPrediction();
}

function updateUI() {
    if (state.hasInvested) {
        document.getElementById('noInvestmentState').classList.add('hidden');
        document.getElementById('tradingDashboard').classList.remove('hidden');
        document.getElementById('tradingPanel').classList.remove('hidden');
        document.getElementById('investmentBanner').classList.remove('hidden');

        document.getElementById('investedAmount').textContent = state.investedAmountNGN.toLocaleString();
        document.getElementById('investedUsd').textContent = state.investedAmountUSD.toFixed(2);
        updateBalance();
    } else {
        document.getElementById('noInvestmentState').classList.remove('hidden');
        document.getElementById('tradingDashboard').classList.add('hidden');
        document.getElementById('tradingPanel').classList.add('hidden');
        document.getElementById('investmentBanner').classList.add('hidden');
    }
}

// Payment Functions
function showDepositModal() {
    if (!state.isLoggedIn) {
        showToast('❌', 'Please login first');
        return;
    }
    document.getElementById('depositModal').classList.remove('hidden');
    updateMinDepositDisplay();
}

function closeDepositModal() {
    document.getElementById('depositModal').classList.add('hidden');
}

function updateMinDepositDisplay() {
    const minUsd = (state.minimumInvestment / state.exchangeRate).toFixed(2);
    document.getElementById('minDepositUsd').textContent = minUsd;
}

function selectPayment(method) {
    state.selectedPaymentMethod = method;
    document.querySelectorAll('.payment-option').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-method="${method}"]`).classList.add('active');

    const symbols = { btc: 'BTC', eth: 'ETH', usdt: 'USDT' };
    document.getElementById('cryptoSymbol').textContent = symbols[method];
    document.getElementById('warningNetwork').textContent = symbols[method];

    calculateCryptoAmount();
}

function calculateCryptoAmount() {
    const ngnAmount = parseFloat(document.getElementById('depositAmountNgn').value) || 0;
    const usdAmount = ngnAmount / state.exchangeRate;

    let cryptoAmount = 0;
    switch(state.selectedPaymentMethod) {
        case 'btc':
            cryptoAmount = usdAmount / state.prices.BTC;
            break;
        case 'eth':
            cryptoAmount = usdAmount / state.prices.ETH;
            break;
        case 'usdt':
            cryptoAmount = usdAmount;
            break;
    }

    document.getElementById('cryptoAmount').textContent = cryptoAmount.toFixed(8);
}

function processDeposit() {
    const amount = parseFloat(document.getElementById('depositAmountNgn').value);

    if (!amount || amount < state.minimumInvestment) {
        showToast('❌', `Minimum deposit is ₦${state.minimumInvestment.toLocaleString()}`);
        return;
    }

    // Show payment details
    document.getElementById('paymentDetails').classList.remove('hidden');
    document.getElementById('depositBtn').textContent = 'I have made the payment';
    document.getElementById('depositBtn').onclick = confirmDeposit;

    // Generate wallet address
    const addresses = {
        btc: 'bc1q' + Array(30).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        eth: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        usdt: 'T' + Array(33).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    };

    document.getElementById('walletAddress').value = addresses[state.selectedPaymentMethod];

    const networks = { btc: 'Bitcoin', eth: 'ERC-20', usdt: 'TRC-20' };
    document.getElementById('networkBadge').textContent = networks[state.selectedPaymentMethod];

    showToast('ℹ️', 'Send exact amount to the address shown');
}

function confirmDeposit() {
    const amount = parseFloat(document.getElementById('depositAmountNgn').value);
    const usdAmount = amount / state.exchangeRate;

    // Simulate deposit confirmation
    state.hasInvested = true;
    state.investedAmountNGN += amount;
    state.investedAmountUSD += usdAmount;
    state.balance += usdAmount;

    saveUserData();
    updateUI();
    closeDepositModal();
    showToast('✅', `Successfully deposited ₦${amount.toLocaleString()}`);

    // Reset modal
    document.getElementById('paymentDetails').classList.add('hidden');
    document.getElementById('depositBtn').textContent = 'Generate Payment Address';
    document.getElementById('depositBtn').onclick = processDeposit;
    document.getElementById('depositAmountNgn').value = '';
}

function copyAddress() {
    const address = document.getElementById('walletAddress');
    address.select();
    document.execCommand('copy');
    showToast('✅', 'Address copied to clipboard');
}

function showWithdrawModal() {
    if (!state.hasInvested) {
        showToast('❌', 'No funds to withdraw');
        return;
    }
    document.getElementById('withdrawModal').classList.remove('hidden');
    document.getElementById('withdrawAvailable').textContent = state.balance.toFixed(2);
}

function closeWithdrawModal() {
    document.getElementById('withdrawModal').classList.add('hidden');
}

function processWithdrawal() {
    const asset = document.getElementById('withdrawAsset').value;
    const address = document.getElementById('withdrawAddress').value.trim();
    const amount = parseFloat(document.getElementById('withdrawAmount').value);

    if (!address || !amount) {
        showToast('❌', 'Please fill in all fields');
        return;
    }

    if (amount < 10) {
        showToast('❌', 'Minimum withdrawal is $10');
        return;
    }

    if (amount > state.balance) {
        showToast('❌', 'Insufficient balance');
        return;
    }

    const fee = amount * 0.01;
    const receive = amount - fee;

    state.balance -= amount;
    saveUserData();
    updateBalance();
    closeWithdrawModal();
    showToast('✅', `Withdrawal of $${amount} initiated`);
}

// Wallet Functions
function toggleWallet() {
    if (state.walletConnected) {
        disconnectWallet();
    } else {
        document.getElementById('walletModal').classList.remove('hidden');
    }
}

function closeWalletModal() {
    document.getElementById('walletModal').classList.add('hidden');
}

function connectWallet(type) {
    state.walletConnected = true;
    state.walletAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    document.getElementById('walletBtnText').textContent = state.walletAddress.slice(0, 6) + '...' + state.walletAddress.slice(-4);
    document.getElementById('walletBtn').classList.add('connected');

    closeWalletModal();
    showToast('✅', 'Wallet connected successfully');
}

function disconnectWallet() {
    state.walletConnected = false;
    state.walletAddress = null;
    document.getElementById('walletBtnText').textContent = 'Connect Wallet';
    document.getElementById('walletBtn').classList.remove('connected');
    showToast('✅', 'Wallet disconnected');
}

// Trading Functions
function renderCoinSelector() {
    const container = document.getElementById('coinSelector');
    container.innerHTML = coins.map(coin => `
        <button onclick="selectCoin('${coin.symbol}')" class="coin-btn ${state.selectedCoin === coin.symbol ? 'active' : ''}">
            <div class="coin-header">
                <div class="coin-icon" style="background: ${coin.color}"></div>
                <span class="coin-symbol">${coin.symbol}</span>
            </div>
            <p class="coin-price">$${coin.price.toLocaleString()}</p>
            <p class="coin-change ${coin.change >= 0 ? 'up' : 'down'}">${coin.change >= 0 ? '+' : ''}${coin.change}%</p>
        </button>
    `).join('');
}

function selectCoin(symbol) {
    state.selectedCoin = symbol;
    renderCoinSelector();
    document.getElementById('currentCoin').textContent = `${symbol}/USDT`;
    updateChart();
    updateAIPrediction();
}

function initChart() {
    const ctx = document.getElementById('tradingChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: '#22c55e',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }, {
                label: 'AI Prediction',
                data: [],
                borderColor: '#a855f7',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `$${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#6b7280', maxTicksLimit: 6 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#6b7280' }
                }
            }
        }
    });

    updateChartData();
}

function updateChartData() {
    const now = new Date();
    const data = [];
    const predictions = [];
    const labels = [];
    let basePrice = state.prices[state.selectedCoin];

    for (let i = 50; i >= 0; i--) {
        const time = new Date(now - i * 60000);
        labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        const randomChange = (Math.random() - 0.5) * (basePrice * 0.002);
        basePrice += randomChange;
        data.push(basePrice);

        if (i < 10) {
            predictions.push(null);
        } else {
            predictions.push(basePrice + (Math.random() - 0.3) * (basePrice * 0.005));
        }
    }

    state.chart.data.labels = labels;
    state.chart.data.datasets[0].data = data;
    state.chart.data.datasets[1].data = predictions;
    state.chart.update('none');

    document.getElementById('currentPrice').textContent = `$${basePrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function updateChart() {
    updateChartData();
}

function changeTimeframe(tf) {
    state.timeframe = tf;
    document.querySelectorAll('.tf-btn').forEach(btn => {
        if (btn.dataset.tf === tf) {
            btn.classList.add('active');
            btn.classList.remove('glass');
        } else {
            btn.classList.remove('active');
        }
    });
    updateChartData();
}

function startPriceSimulation() {
    setInterval(() => {
        coins.forEach(coin => {
            const change = (Math.random() - 0.5) * 0.002;
            coin.price *= (1 + change);
            coin.change += change * 100;
        });

        state.prices[state.selectedCoin] = coins.find(c => c.symbol === state.selectedCoin).price;
        document.getElementById('currentPrice').textContent = `$${state.prices[state.selectedCoin].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        if (state.chart && state.chart.data.labels.length > 0) {
            const now = new Date();
            const currentPrice = state.prices[state.selectedCoin];

            if (state.chart.data.labels.length > 50) {
                state.chart.data.labels.shift();
                state.chart.data.datasets[0].data.shift();
                state.chart.data.datasets[1].data.shift();
            }

            state.chart.data.labels.push(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            state.chart.data.datasets[0].data.push(currentPrice);
            state.chart.data.datasets[1].data.push(currentPrice + (Math.random() - 0.3) * (currentPrice * 0.005));
            state.chart.update('none');
        }

        renderCoinSelector();
        updateOrderBook();
    }, 2000);
}

function updateAIPrediction() {
    const signals = [
        { text: 'Strong buy signal detected', confidence: 92, trend: '↑ Rising' },
        { text: 'Bullish momentum building', confidence: 87, trend: '↑ Rising' },
        { text: 'Neutral with upside bias', confidence: 65, trend: '→ Stable' },
        { text: 'Correction expected soon', confidence: 78, trend: '↓ Falling' }
    ];

    const signal = signals[Math.floor(Math.random() * signals.length)];
    document.getElementById('aiSignal').textContent = signal.text;
    document.getElementById('aiConfidence').textContent = signal.confidence + '%';

    const trendEl = document.getElementById('trendIndicator');
    trendEl.textContent = signal.trend;
    trendEl.className = signal.trend.includes('Rising') ? 'trend-up' : signal.trend.includes('Falling') ? 'trend-down' : '';
}

function generateOrderBook() {
    updateOrderBook();
}

function updateOrderBook() {
    const container = document.getElementById('orderBook');
    const currentPrice = state.prices[state.selectedCoin];
    let html = '';

    for (let i = 5; i >= 1; i--) {
        const price = currentPrice * (1 + i * 0.001);
        const amount = (Math.random() * 2 + 0.1).toFixed(4);
        const width = Math.random() * 100;
        html += `
            <div class="flex justify-between text-xs relative overflow-hidden py-1">
                <div class="absolute right-0 top-0 bottom-0 bg-red-500/10" style="width: ${width}%"></div>
                <span class="text-red-400 relative z-10 font-mono">${price.toFixed(2)}</span>
                <span class="text-gray-400 relative z-10 font-mono">${amount}</span>
            </div>
        `;
    }

    html += `<div class="text-center py-2 text-lg font-bold text-white border-y border-white/10 my-2">${currentPrice.toFixed(2)}</div>`;

    for (let i = 1; i <= 5; i++) {
        const price = currentPrice * (1 - i * 0.001);
        const amount = (Math.random() * 2 + 0.1).toFixed(4);
        const width = Math.random() * 100;
        html += `
            <div class="flex justify-between text-xs relative overflow-hidden py-1">
                <div class="absolute right-0 top-0 bottom-0 bg-green-500/10" style="width: ${width}%"></div>
                <span class="text-green-400 relative z-10 font-mono">${price.toFixed(2)}</span>
                <span class="text-gray-400 relative z-10 font-mono">${amount}</span>
            </div>
        `;
    }

    container.innerHTML = html;
}

function generateRecentTrades() {
    const container = document.getElementById('recentTrades');
    const types = ['Buy', 'Sell'];

    setInterval(() => {
        const currentPrice = state.prices[state.selectedCoin];
        const type = types[Math.floor(Math.random() * types.length)];
        const amount = (Math.random() * 0.5 + 0.01).toFixed(4);
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const div = document.createElement('div');
        div.className = 'flex justify-between text-xs py-2 border-b border-white/5 last:border-0';
        div.innerHTML = `
            <span class="${type === 'Buy' ? 'text-green-400' : 'text-red-400'} font-medium">${type}</span>
            <span class="text-gray-300 font-mono">${amount} ${state.selectedCoin}</span>
            <span class="text-gray-400 font-mono">${currentPrice.toFixed(2)}</span>
            <span class="text-gray-500 text-xs">${time}</span>
        `;

        container.insertBefore(div, container.firstChild);
        if (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
    }, 3000);
}

function openTradeModal(type) {
    if (!state.walletConnected) {
        showToast('❌', 'Please connect your wallet first');
        return;
    }

    state.tradeType = type;
    document.getElementById('tradeTitle').textContent = type === 'buy' ? `Buy ${state.selectedCoin}` : `Sell ${state.selectedCoin}`;
    document.getElementById('confirmTradeBtn').textContent = `Confirm ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    document.getElementById('confirmTradeBtn').className = `btn-confirm ${type === 'buy' ? 'bg-green-600' : 'bg-red-600'}`;
    document.getElementById('modalPrice').textContent = `$${state.prices[state.selectedCoin].toLocaleString()}`;
    document.getElementById('tradeModal').classList.remove('hidden');
}

function closeTradeModal() {
    document.getElementById('tradeModal').classList.add('hidden');
    document.getElementById('tradeAmount').value = '';
}

function setTradeAmount(percentage) {
    const maxAmount = state.tradeType === 'buy' ? state.balance : (state.holdings[state.selectedCoin] || 0) * state.prices[state.selectedCoin];
    const amount = (maxAmount * percentage / 100).toFixed(2);
    document.getElementById('tradeAmount').value = amount;
    updateTradeCalculation();
}

document.getElementById('tradeAmount')?.addEventListener('input', updateTradeCalculation);

function updateTradeCalculation() {
    const amount = parseFloat(document.getElementById('tradeAmount').value) || 0;
    const price = state.prices[state.selectedCoin];
    const fee = amount * 0.001;
    const receive = state.tradeType === 'buy' ? (amount - fee) / price : (amount - fee);

    document.getElementById('modalReceive').textContent = `${receive.toFixed(8)} ${state.tradeType === 'buy' ? state.selectedCoin : 'USDT'}`;
    document.getElementById('modalFee').textContent = `$${fee.toFixed(2)}`;
}

function executeTrade() {
    const amount = parseFloat(document.getElementById('tradeAmount').value);
    if (!amount || amount <= 0) {
        showToast('❌', 'Please enter a valid amount');
        return;
    }

    if (state.tradeType === 'buy') {
        if (amount > state.balance) {
            showToast('❌', 'Insufficient balance');
            return;
        }
        state.balance -= amount;
        const received = (amount * 0.999) / state.prices[state.selectedCoin];
        state.holdings[state.selectedCoin] = (state.holdings[state.selectedCoin] || 0) + received;
        showToast('✅', `Successfully bought ${received.toFixed(6)} ${state.selectedCoin}`);
    } else {
        const holding = state.holdings[state.selectedCoin] || 0;
        const sellAmount = amount / state.prices[state.selectedCoin];
        if (sellAmount > holding) {
            showToast('❌', 'Insufficient holdings');
            return;
        }
        state.holdings[state.selectedCoin] -= sellAmount;
        state.balance += amount * 0.999;
        showToast('✅', `Successfully sold ${sellAmount.toFixed(6)} ${state.selectedCoin}`);
    }

    saveUserData();
    updateBalance();
    closeTradeModal();
}

function updateBalance() {
    document.getElementById('totalBalance').textContent = state.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function showDeposit() {
    showDepositModal();
}

function showWithdraw() {
    showWithdrawModal();
}

// Toast Notification
function showToast(icon, message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastIcon').textContent = icon;
    document.getElementById('toastMessage').textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDepositModal();
        closeWithdrawModal();
        closeTradeModal();
        closeWalletModal();
    }
});
// ==================== NOWPAYMENTS INTEGRATION ====================

const NOWPAYMENTS_CONFIG = {
    apiUrl: window.location.origin.includes('localhost') 
        ? 'http://localhost:3000' 
        : window.location.origin,
    minDeposit: 5 // $5 USD minimum
};

// Replace old deposit functions with NOWPayments
async function createNowPayment(amountUSD) {
    try {
        const response = await fetch(`${NOWPAYMENTS_CONFIG.apiUrl}/api/create-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amountUSD,
                email: state.currentUser?.email
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }

        return result.data;
    } catch (error) {
        console.error('Payment creation failed:', error);
        showToast('❌', error.message);
        return null;
    }
}

// Override existing deposit modal function
function showDepositModal() {
    if (!state.isLoggedIn) {
        showToast('❌', 'Please login first');
        return;
    }
    
    // Show custom NOWPayments modal
    document.getElementById('nowpaymentsModal')?.classList.remove('hidden') 
        || showNowPaymentsModal();
}

// New NOWPayments modal
function showNowPaymentsModal() {
    // Create modal if doesn't exist
    let modal = document.getElementById('nowpaymentsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'nowpaymentsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeNowPaymentsModal()"></div>
            <div class="modal-content slide-up">
                <div class="modal-handle"></div>
                <h3 class="modal-title">Deposit via Crypto</h3>
                <div class="modal-body">
                    <div class="deposit-info">
                        <div class="minimum-deposit">
                            <span class="label">Enter Amount (USD)</span>
                            <input type="number" id="npAmount" class="amount-input" placeholder="50" min="5" value="50">
                            <span class="usd">Minimum: $${NOWPAYMENTS_CONFIG.minDeposit}</span>
                        </div>
                    </div>
                    
                    <div class="payment-info-box" style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                        <p style="font-size: 13px; color: #8b92a8; margin-bottom: 8px;">You will pay with:</p>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background: rgba(191, 187, 187, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">Ł</div>
                            <div>
                                <p style="font-weight: 600;">Litecoin (LTC)</p>
                                <p style="font-size: 12px; color: #8b92a8;">Fast & Low fees</p>
                            </div>
                        </div>
                    </div>

                    <div id="npPaymentDetails" class="hidden">
                        <div class="payment-details">
                            <div class="qr-section">
                                <div class="qr-code" id="npQrCode">
                                    <div class="qr-placeholder">Loading...</div>
                                </div>
                                <p class="qr-instruction">Send LTC to this address</p>
                            </div>
                            <div class="wallet-address-section">
                                <label>Payment Address</label>
                                <div class="address-box">
                                    <input type="text" id="npPayAddress" readonly>
                                    <button onclick="copyNpAddress()" class="copy-btn">📋</button>
                                </div>
                            </div>
                            <div class="wallet-address-section">
                                <label>Amount to Send</label>
                                <div class="address-box">
                                    <input type="text" id="npPayAmount" readonly style="color: #22c55e; font-weight: 600;">
                                    <span style="padding: 12px; color: #8b92a8;">LTC</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onclick="processNowPayment()" class="btn-confirm" id="npBtn">Generate Payment</button>
                    
                    <div class="deposit-warning">
                        <p>⚠️ Funds will be automatically converted and sent to your trading balance after 3 confirmations.</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.classList.remove('hidden');
}

function closeNowPaymentsModal() {
    document.getElementById('nowpaymentsModal')?.classList.add('hidden');
    // Reset
    document.getElementById('npPaymentDetails')?.classList.add('hidden');
    document.getElementById('npBtn').textContent = 'Generate Payment';
    document.getElementById('npBtn').onclick = processNowPayment;
}

async function processNowPayment() {
    const amount = parseFloat(document.getElementById('npAmount').value);
    
    if (!amount || amount < NOWPAYMENTS_CONFIG.minDeposit) {
        showToast('❌', `Minimum deposit is $${NOWPAYMENTS_CONFIG.minDeposit}`);
        return;
    }

    const btn = document.getElementById('npBtn');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    const payment = await createNowPayment(amount);
    
    if (payment) {
        // Show payment details
        document.getElementById('npPaymentDetails').classList.remove('hidden');
        document.getElementById('npPayAddress').value = payment.payAddress;
        document.getElementById('npPayAmount').value = payment.payAmount;
        
        // Generate QR code URL
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=litecoin:${payment.payAddress}?amount=${payment.payAmount}`;
        document.getElementById('npQrCode').innerHTML = `<img src="${qrUrl}" style="width: 100%; height: 100%; border-radius: 8px;">`;
        
        btn.textContent = 'I Have Made Payment';
        btn.onclick = () => confirmNowPayment(payment.orderId);
        btn.disabled = false;
        
        showToast('✅', 'Send exact LTC amount shown');
        
        // Start polling for status
        startPaymentPolling(payment.orderId);
    } else {
        btn.textContent = 'Generate Payment';
        btn.disabled = false;
    }
}

function copyNpAddress() {
    const addr = document.getElementById('npPayAddress');
    addr.select();
    document.execCommand('copy');
    showToast('✅', 'Address copied');
}

async function confirmNowPayment(orderId) {
    showToast('⏳', 'Checking payment status...');
    
    try {
        const response = await fetch(`${NOWPAYMENTS_CONFIG.apiUrl}/api/payment-status/${orderId}`);
        const result = await response.json();
        
        if (result.data?.status === 'finished' || result.data?.status === 'confirmed') {
            // Payment complete
            const amount = parseFloat(document.getElementById('npAmount').value);
            state.hasInvested = true;
            state.investedAmountUSD += amount;
            state.investedAmountNGN += amount * state.exchangeRate;
            state.balance += amount;
            
            saveUserData();
            updateUI();
            closeNowPaymentsModal();
            showToast('✅', `Deposit of $${amount} successful!`);
        } else {
            showToast('⏳', 'Payment still processing. Check again in a few minutes.');
        }
    } catch (error) {
        showToast('❌', 'Could not verify payment');
    }
}

function startPaymentPolling(orderId) {
    // Poll every 10 seconds for 5 minutes
    let attempts = 0;
    const maxAttempts = 30;
    
    const interval = setInterval(async () => {
        attempts++;
        
        try {
            const response = await fetch(`${NOWPAYMENTS_CONFIG.apiUrl}/api/payment-status/${orderId}`);
            const result = await response.json();
            
            if (result.data?.status === 'finished') {
                clearInterval(interval);
                // Auto-complete
                confirmNowPayment(orderId);
            }
        } catch (e) {
            console.error('Polling error:', e);
        }
        
        if (attempts >= maxAttempts) {
            clearInterval(interval);
        }
    }, 10000);
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeNowPaymentsModal();
    }
});
