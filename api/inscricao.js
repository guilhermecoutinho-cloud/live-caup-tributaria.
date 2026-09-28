// Função serverless da Vercel: recebe a inscrição da landing page
// e repassa para o webhook da Unnica. O token fica guardado na Vercel
// (variável de ambiente UNNICA_TOKEN), nunca aparece no site.

const WEBHOOK = 'https://webhook.unnica.com.br/functions/v1/flow-webhook-receive';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, erro: 'Método não permitido' });
  }

  const token = process.env.UNNICA_TOKEN;
  if (!token) {
    return res.status(500).json({ ok: false, erro: 'UNNICA_TOKEN não configurado na Vercel' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const nome = String(body?.nome || '').trim().slice(0, 120);
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 160);
  const digitos = String(body?.telefone || '').replace(/\D/g, '').slice(0, 11);

  if (nome.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || digitos.length < 10) {
    return res.status(400).json({ ok: false, erro: 'Dados inválidos' });
  }

  const payload = {
    nome,
    email,
    telefone: '55' + digitos,
    evento: 'Live Estratégias Tributárias para 2027',
    data_evento: '2026-10-08T10:30:00-03:00',
    origem: 'landing-page-live-tributaria',
    inscrito_em: new Date().toISOString()
  };

  try {
    const r = await fetch(`${WEBHOOK}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('Unnica respondeu', r.status, txt);
      return res.status(502).json({ ok: false, erro: 'CRM indisponível' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Falha ao chamar a Unnica', e);
    return res.status(502).json({ ok: false, erro: 'CRM indisponível' });
  }
}
