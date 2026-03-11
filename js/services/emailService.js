/**
 * ============================================================
 * AlexisDigital Manager — Email Service (emailService.js)
 * ============================================================
 * 
 * Handles email sending logic.
 * Currently simulated (logs to history).
 * Future: integrate with Resend, SendGrid, or Supabase Edge Functions.
 * ============================================================
 */

window.emailService = {

  PROVIDERS: {
    simulated: 'simulated',
    resend:    'resend',
    sendgrid:  'sendgrid',
    supabase:  'supabase-edge',
  },

  _provider: 'simulated',
  _apiKey: null,

  /**
   * Configure the email provider.
   * @param {string} provider - 'simulated' | 'resend' | 'sendgrid' | 'supabase-edge'
   * @param {string} apiKey   - API key for the provider
   */
  configure(provider, apiKey) {
    this._provider = provider;
    this._apiKey = apiKey;
    console.log(`[email] Configured provider: ${provider}`);
  },

  /**
   * Send an email.
   * @param {object} options
   * @param {string} options.to       - Recipient email
   * @param {string} options.subject  - Email subject
   * @param {string} options.body     - Email body (plain text or HTML)
   * @param {string} options.from     - Sender email (optional)
   * @param {number} options.clienteId - Related client ID
   */
  async send({ to, subject, body, from, clienteId }) {
    switch (this._provider) {
      case 'resend':
        return this._sendResend({ to, subject, body, from });
      case 'sendgrid':
        return this._sendSendGrid({ to, subject, body, from });
      case 'supabase-edge':
        return this._sendSupabaseEdge({ to, subject, body, from });
      default:
        return this._simulate({ to, subject, body, clienteId });
    }
  },

  /** Simulated send — logs to email_history */
  async _simulate({ to, subject, body, clienteId }) {
    const record = {
      id: Date.now(),
      clienteId,
      asunto: subject,
      cuerpo: body,
      fecha: new Date().toISOString().split('T')[0],
      evento: 'email_enviado',
      estado: 'enviado',
      created_at: new Date().toISOString(),
    };
    if (window.DB?.email_history) window.DB.email_history.unshift(record);
    console.log('[email] Simulated send:', { to, subject });
    return { success: true, id: record.id, simulated: true };
  },

  /** Resend API */
  async _sendResend({ to, subject, body, from }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this._apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: from || 'noreply@alexisdigital.com', to, subject, html: body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend error');
    return { success: true, id: data.id };
  },

  /** SendGrid API */
  async _sendSendGrid({ to, subject, body, from }) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this._apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from || 'noreply@alexisdigital.com' },
        subject,
        content: [{ type: 'text/html', value: body }],
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.errors?.[0]?.message || 'SendGrid error');
    }
    return { success: true };
  },

  /** Supabase Edge Function */
  async _sendSupabaseEdge({ to, subject, body, from }) {
    if (!window._supabaseClient) throw new Error('Supabase not initialized');
    const { data, error } = await window._supabaseClient.functions.invoke('send-email', {
      body: { to, subject, body, from },
    });
    if (error) throw error;
    return { success: true, data };
  },

  /**
   * Process template variables.
   * @param {string} text - Template with {{VARIABLE}} placeholders
   * @param {object} vars - Variable map
   */
  processTemplate(text, vars = {}) {
    let result = text;
    const defaults = {
      AGENCIA: window.DB?.sistema?.nombre || 'AlexisDigital',
      FECHA: new Date().toLocaleDateString('es-AR'),
    };
    const all = { ...defaults, ...vars };
    Object.entries(all).forEach(([k, v]) => {
      result = result.replaceAll(`{{${k}}}`, v || '');
    });
    return result;
  },
};

console.log('[email] Email service loaded');
