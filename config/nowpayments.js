require('dotenv').config();

module.exports = {
    // API credentials
    apiKey: process.env.NOWPAYMENTS_API_KEY,
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
    
    // Payout settings
    payoutAddress: process.env.BUSHA_LTC_ADDRESS,
    payoutCurrency: 'ltc',
    
    // Webhook
    webhookUrl: process.env.WEBHOOK_URL,
    
    // API endpoints
    baseUrl: 'https://api.nowpayments.io/v1',
    
    // Validate config
    validate() {
        if (!this.apiKey) throw new Error('NOWPAYMENTS_API_KEY missing');
        if (!this.ipnSecret) throw new Error('NOWPAYMENTS_IPN_SECRET missing');
        if (!this.payoutAddress) throw new Error('BUSHA_LTC_ADDRESS missing');
        console.log('✅ NOWPayments config validated');
    }
};
