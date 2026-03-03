require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Validate config
const config = {
    apiKey: process.env.NOWPAYMENTS_API_KEY,
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
    payoutAddress: process.env.BUSHA_LTC_ADDRESS,
    webhookUrl: process.env.WEBHOOK_URL
};

if (!config.apiKey || !config.ipnSecret || !config.payoutAddress) {
    console.error('❌ Missing required environment variables!');
    process.exit(1);
}

console.log('✅ Config loaded. Payout address:', config.payoutAddress.substring(0, 10) + '...');

// In-memory storage (replace with database in production)
const payments = new Map();

// ==================== API ROUTES ====================

// Create payment
app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, orderId, email } = req.body;
        
        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'Minimum amount is $1' });
        }

        const id = orderId || `ORD-${Date.now()}`;
        
        const payload = {
            price_amount: amount,
            price_currency: 'usd',
            pay_currency: 'ltc',
            ipn_callback_url: config.webhookUrl,
            order_id: id,
            order_description: `Crypto AI Investment - ${id}`,
            success_url: `${config.webhookUrl.replace('/webhook/nowpayments', '')}/success.html?order=${id}`,
            cancel_url: `${config.webhookUrl.replace('/webhook/nowpayments', '')}/cancel.html?order=${id}`,
            is_fixed_rate: true,
            payout_address: config.payoutAddress,
            payout_currency: 'ltc'
        };

        const response = await fetch('https://api.nowpayments.io/v1/payment', {
            method: 'POST',
            headers: {
                'x-api-key': config.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Payment creation failed');
        }

        // Store payment
        payments.set(id, {
            orderId: id,
            paymentId: data.payment_id,
            amount: amount,
            status: 'pending',
            email: email,
            createdAt: new Date(),
            payAddress: data.pay_address,
            payAmount: data.pay_amount
        });

        console.log('✅ Payment created:', id, 'Amount:', amount, 'LTC');

        res.json({
            success: true,
            data: {
                orderId: id,
                paymentId: data.payment_id,
                paymentUrl: data.invoice_url,
                payAddress: data.pay_address,
                payAmount: data.pay_amount,
                payCurrency: 'LTC'
            }
        });

    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get payment status
app.get('/api/payment-status/:orderId', (req, res) => {
    const payment = payments.get(req.params.orderId);
    if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ success: true, data: payment });
});

// Get all payments (admin)
app.get('/api/payments', (req, res) => {
    res.json({ 
        success: true, 
        data: Array.from(payments.values()) 
    });
});

// ==================== WEBHOOK HANDLER ====================

app.post('/webhook/nowpayments', (req, res) => {
    console.log('🔔 Webhook received:', new Date().toISOString());
    
    try {
        // Verify signature
        const signature = req.headers['x-nowpayments-sig'];
        if (!signature) {
            console.error('❌ Missing signature');
            return res.status(400).json({ error: 'Missing signature' });
        }

        if (!verifySignature(req.body, signature)) {
            console.error('❌ Invalid signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const payment = req.body;
        const { payment_status, order_id } = payment;

        console.log('📦 Payment update:', {
            order_id: order_id,
            status: payment_status,
            amount: payment.pay_amount,
            currency: payment.pay_currency
        });

        // Update stored payment
        const stored = payments.get(order_id);
        if (stored) {
            stored.status = payment_status;
            stored.updatedAt = new Date();
            
            if (payment_status === 'finished') {
                stored.completedAt = new Date();
                stored.outcomeAmount = payment.outcome_amount;
                console.log('🎉 PAYMENT COMPLETE:', order_id, 'Received:', payment.outcome_amount, 'LTC');
                
                // TODO: Activate user investment here
                // Send email, update user balance, etc.
            }
            
            payments.set(order_id, stored);
        }

        // Always return 200
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ received: true, error: 'Processed with errors' });
    }
});

function verifySignature(body, signature) {
    const hmac = crypto.createHmac('sha512', config.ipnSecret);
    hmac.update(JSON.stringify(body));
    return hmac.digest('hex') === signature;
}

// ==================== STATIC PAGES ====================

app.get('/success.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    background: #0a0e1a; 
                    color: white; 
                    font-family: Inter, sans-serif;
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0;
                    text-align: center;
                }
                .container { padding: 20px; }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { color: #22c55e; margin-bottom: 10px; }
                p { color: #8b92a8; margin-bottom: 30px; }
                .btn { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    padding: 16px 32px; 
                    border-radius: 12px; 
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>Payment Successful!</h1>
                <p>Your investment is being processed. You will receive a confirmation shortly.</p>
                <a href="/" class="btn">Return to App</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/cancel.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    background: #0a0e1a; 
                    color: white; 
                    font-family: Inter, sans-serif;
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0;
                    text-align: center;
                }
                .container { padding: 20px; }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { color: #ef4444; margin-bottom: 10px; }
                p { color: #8b92a8; margin-bottom: 30px; }
                .btn { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    padding: 16px 32px; 
                    border-radius: 12px; 
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">❌</div>
                <h1>Payment Cancelled</h1>
                console.error('❌ Missing required environment variables!');
    process.exit(1);
}

console.log('✅ Config loaded. Payout address:', config.payoutAddress.substring(0, 10) + '...');

// In-memory storage (replace with database in production)
const payments = new Map();

// ==================== API ROUTES ====================

// Create payment
app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, orderId, email } = req.body;
        
        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'Minimum amount is $1' });
        }

        const id = orderId || `ORD-${Date.now()}`;
        
        const payload = {
            price_amount: amount,
            price_currency: 'usd',
            pay_currency: 'ltc',
            ipn_callback_url: config.webhookUrl,
            order_id: id,
            order_description: `Crypto AI Investment - ${id}`,
            success_url: `${config.webhookUrl.replace('/webhook/nowpayments', '')}/success.html?order=${id}`,
            cancel_url: `${config.webhookUrl.replace('/webhook/nowpayments', '')}/cancel.html?order=${id}`,
            is_fixed_rate: true,
            payout_address: config.payoutAddress,
            payout_currency: 'ltc'
        };

        const response = await fetch('https://api.nowpayments.io/v1/payment', {
            method: 'POST',
            headers: {
                'x-api-key': config.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Payment creation failed');
        }

        // Store payment
        payments.set(id, {
            orderId: id,
            paymentId: data.payment_id,
            amount: amount,
            status: 'pending',
            email: email,
            createdAt: new Date(),
            payAddress: data.pay_address,
            payAmount: data.pay_amount
        });

        console.log('✅ Payment created:', id, 'Amount:', amount, 'LTC');

        res.json({
            success: true,
            data: {
                orderId: id,
                paymentId: data.payment_id,
                paymentUrl: data.invoice_url,
                payAddress: data.pay_address,
                payAmount: data.pay_amount,
                payCurrency: 'LTC'
            }
        });

    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get payment status
app.get('/api/payment-status/:orderId', (req, res) => {
    const payment = payments.get(req.params.orderId);
    if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ success: true, data: payment });
});

// Get all payments (admin)
app.get('/api/payments', (req, res) => {
    res.json({ 
        success: true, 
        data: Array.from(payments.values()) 
    });
});

// ==================== WEBHOOK HANDLER ====================

app.post('/webhook/nowpayments', (req, res) => {
    console.log('🔔 Webhook received:', new Date().toISOString());
    
    try {
        // Verify signature
        const signature = req.headers['x-nowpayments-sig'];
        if (!signature) {
            console.error('❌ Missing signature');
            return res.status(400).json({ error: 'Missing signature' });
        }

        if (!verifySignature(req.body, signature)) {
            console.error('❌ Invalid signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const payment = req.body;
        const { payment_status, order_id } = payment;

        console.log('📦 Payment update:', {
            order_id: order_id,
            status: payment_status,
            amount: payment.pay_amount,
            currency: payment.pay_currency
        });

        // Update stored payment
        const stored = payments.get(order_id);
        if (stored) {
            stored.status = payment_status;
            stored.updatedAt = new Date();
            
            if (payment_status === 'finished') {
                stored.completedAt = new Date();
                stored.outcomeAmount = payment.outcome_amount;
                console.log('🎉 PAYMENT COMPLETE:', order_id, 'Received:', payment.outcome_amount, 'LTC');
                
                // TODO: Activate user investment here
                // Send email, update user balance, etc.
            }
            
            payments.set(order_id, stored);
        }

        // Always return 200
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ received: true, error: 'Processed with errors' });
    }
});

function verifySignature(body, signature) {
    const hmac = crypto.createHmac('sha512', config.ipnSecret);
    hmac.update(JSON.stringify(body));
    return hmac.digest('hex') === signature;
}

// ==================== STATIC PAGES ====================

app.get('/success.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    background: #0a0e1a; 
                    color: white; 
                    font-family: Inter, sans-serif;
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0;
                    text-align: center;
                }
                .container { padding: 20px; }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { color: #22c55e; margin-bottom: 10px; }
                p { color: #8b92a8; margin-bottom: 30px; }
                .btn { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    padding: 16px 32px; 
                    border-radius: 12px; 
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>Payment Successful!</h1>
                <p>Your investment is being processed. You will receive a confirmation shortly.</p>
                <a href="/" class="btn">Return to App</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/cancel.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    background: #0a0e1a; 
                    color: white; 
                    font-family: Inter, sans-serif;
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0;
                    text-align: center;
                }
                .container { padding: 20px; }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { color: #ef4444; margin-bottom: 10px; }
                p { color: #8b92a8; margin-bottom: 30px; }
                .btn { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; 
                    padding: 16px 32px; 
                    border-radius: 12px; 
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">❌</div>
                <h1>Payment Cancelled</h1>
                <p>Your payment was cancelled. No funds were charged.</p>
                <a href="/" class="btn">Try Again</a>
            </div>
        </body>
        </html>
    `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    🚀 Crypto AI Server Started
    ===========================
    Port: ${PORT}
    Webhook: ${config.webhookUrl}
    
    Endpoints:
    POST /api/create-payment    - Create new payment
    GET  /api/payment-status/:id - Check status
    POST /webhook/nowpayments   - NOWPayments webhook
    
    Make sure to:
    1. Add your Busha LTC address to .env
    2. Deploy with HTTPS
    3. Update WEBHOOK_URL with your domain
    4. Add webhook URL in NOWPayments dashboard
    `);
});
