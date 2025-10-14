/**
 * Template Engine
 * Formats notification content for different channels
 * Story 1.3: Alert Engine and Notification System - Phase 6.3
 */

export interface TemplateData {
  rule_name: string;
  message: string;
  triggered_value: number;
  threshold_value: number;
  protocol_name?: string;
  token_symbol?: string;
  chain?: string;
  timestamp: number;
  alert_type: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface PushTemplate {
  title: string;
  body: string;
}

// ============================================================================
// Email Templates
// ============================================================================

function formatCurrency(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function generateEmailTemplate(data: TemplateData): EmailTemplate {
  const { alert_type } = data;

  switch (alert_type) {
    case 'price_change':
      return generatePriceChangeEmail(data);
    case 'tvl_change':
      return generateTvlChangeEmail(data);
    case 'volume_spike':
      return generateVolumeSpikeEmail(data);
    case 'protocol_event':
      return generateProtocolEventEmail(data);
    default:
      return generateGenericEmail(data);
  }
}

function generatePriceChangeEmail(data: TemplateData): EmailTemplate {
  const direction = data.triggered_value > data.threshold_value ? 'Increased' : 'Decreased';
  const subject = `Alert: ${data.token_symbol || 'Token'} Price ${direction}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .table td:first-child { font-weight: bold; width: 40%; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Price Alert</h2>
    </div>
    <div class="content">
      <h3>${data.rule_name}</h3>
      <p>${data.message}</p>
      <table class="table">
        <tr>
          <td>Token:</td>
          <td>${data.token_symbol || 'N/A'}</td>
        </tr>
        <tr>
          <td>Current Price:</td>
          <td>${formatCurrency(data.triggered_value)}</td>
        </tr>
        <tr>
          <td>Threshold:</td>
          <td>${formatCurrency(data.threshold_value)}</td>
        </tr>
        <tr>
          <td>Time:</td>
          <td>${formatTimestamp(data.timestamp)}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p>This is an automated alert from DeFiLlama</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Price Alert: ${data.rule_name}

${data.message}

Token: ${data.token_symbol || 'N/A'}
Current Price: ${formatCurrency(data.triggered_value)}
Threshold: ${formatCurrency(data.threshold_value)}
Time: ${formatTimestamp(data.timestamp)}

---
This is an automated alert from DeFiLlama
  `;

  return { subject, html, text };
}

function generateTvlChangeEmail(data: TemplateData): EmailTemplate {
  const direction = data.triggered_value > data.threshold_value ? 'Increased' : 'Decreased';
  const subject = `Alert: ${data.protocol_name || 'Protocol'} TVL ${direction}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .table td:first-child { font-weight: bold; width: 40%; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📊 TVL Alert</h2>
    </div>
    <div class="content">
      <h3>${data.rule_name}</h3>
      <p>${data.message}</p>
      <table class="table">
        <tr>
          <td>Protocol:</td>
          <td>${data.protocol_name || 'N/A'}</td>
        </tr>
        <tr>
          <td>Current TVL:</td>
          <td>${formatCurrency(data.triggered_value)}</td>
        </tr>
        <tr>
          <td>Threshold:</td>
          <td>${formatCurrency(data.threshold_value)}</td>
        </tr>
        <tr>
          <td>Time:</td>
          <td>${formatTimestamp(data.timestamp)}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p>This is an automated alert from DeFiLlama</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
TVL Alert: ${data.rule_name}

${data.message}

Protocol: ${data.protocol_name || 'N/A'}
Current TVL: ${formatCurrency(data.triggered_value)}
Threshold: ${formatCurrency(data.threshold_value)}
Time: ${formatTimestamp(data.timestamp)}

---
This is an automated alert from DeFiLlama
  `;

  return { subject, html, text };
}

function generateVolumeSpikeEmail(data: TemplateData): EmailTemplate {
  const subject = `Alert: ${data.token_symbol || 'Token'} Volume Spike`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .table td:first-child { font-weight: bold; width: 40%; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚡ Volume Spike Alert</h2>
    </div>
    <div class="content">
      <h3>${data.rule_name}</h3>
      <p>${data.message}</p>
      <table class="table">
        <tr>
          <td>Token:</td>
          <td>${data.token_symbol || 'N/A'}</td>
        </tr>
        <tr>
          <td>Current Volume:</td>
          <td>${formatCurrency(data.triggered_value)}</td>
        </tr>
        <tr>
          <td>Threshold:</td>
          <td>${formatCurrency(data.threshold_value)}</td>
        </tr>
        <tr>
          <td>Time:</td>
          <td>${formatTimestamp(data.timestamp)}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p>This is an automated alert from DeFiLlama</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Volume Spike Alert: ${data.rule_name}

${data.message}

Token: ${data.token_symbol || 'N/A'}
Current Volume: ${formatCurrency(data.triggered_value)}
Threshold: ${formatCurrency(data.threshold_value)}
Time: ${formatTimestamp(data.timestamp)}

---
This is an automated alert from DeFiLlama
  `;

  return { subject, html, text };
}

function generateProtocolEventEmail(data: TemplateData): EmailTemplate {
  const subject = `Alert: ${data.protocol_name || 'Protocol'} Event`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #9C27B0; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Protocol Event Alert</h2>
    </div>
    <div class="content">
      <h3>${data.rule_name}</h3>
      <p>${data.message}</p>
      <p><strong>Protocol:</strong> ${data.protocol_name || 'N/A'}</p>
      <p><strong>Time:</strong> ${formatTimestamp(data.timestamp)}</p>
    </div>
    <div class="footer">
      <p>This is an automated alert from DeFiLlama</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Protocol Event Alert: ${data.rule_name}

${data.message}

Protocol: ${data.protocol_name || 'N/A'}
Time: ${formatTimestamp(data.timestamp)}

---
This is an automated alert from DeFiLlama
  `;

  return { subject, html, text };
}

function generateGenericEmail(data: TemplateData): EmailTemplate {
  const subject = `Alert: ${data.rule_name}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #607D8B; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Alert</h2>
    </div>
    <div class="content">
      <h3>${data.rule_name}</h3>
      <p>${data.message}</p>
      <p><strong>Time:</strong> ${formatTimestamp(data.timestamp)}</p>
    </div>
    <div class="footer">
      <p>This is an automated alert from DeFiLlama</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Alert: ${data.rule_name}

${data.message}

Time: ${formatTimestamp(data.timestamp)}

---
This is an automated alert from DeFiLlama
  `;

  return { subject, html, text };
}

// ============================================================================
// Webhook Payload
// ============================================================================

export function generateWebhookPayload(data: TemplateData): any {
  return {
    alert_type: data.alert_type,
    rule_name: data.rule_name,
    message: data.message,
    triggered_value: data.triggered_value,
    threshold_value: data.threshold_value,
    protocol_name: data.protocol_name,
    token_symbol: data.token_symbol,
    chain: data.chain,
    timestamp: data.timestamp,
    formatted_timestamp: formatTimestamp(data.timestamp),
  };
}

// ============================================================================
// Push Notification
// ============================================================================

export function generatePushNotification(data: TemplateData): PushTemplate {
  const { alert_type } = data;

  switch (alert_type) {
    case 'price_change':
      return {
        title: `${data.token_symbol || 'Token'} Price Alert`,
        body: data.message,
      };
    case 'tvl_change':
      return {
        title: `${data.protocol_name || 'Protocol'} TVL Alert`,
        body: data.message,
      };
    case 'volume_spike':
      return {
        title: `${data.token_symbol || 'Token'} Volume Spike`,
        body: data.message,
      };
    case 'protocol_event':
      return {
        title: `${data.protocol_name || 'Protocol'} Event`,
        body: data.message,
      };
    default:
      return {
        title: data.rule_name,
        body: data.message,
      };
  }
}

