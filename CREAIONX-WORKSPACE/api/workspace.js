const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxWZLpE9APX0G9K1YPSFknwt_uHuuWaRQB96I28x3wlSTaAv6qb6vV6Go7iOyeeDWffTA/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
      redirect: 'follow'
    });

    const text = await upstream.text();
    res.status(upstream.ok ? 200 : upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(text);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: 'Unable to reach the CREAIONX Workspace backend.',
      detail: error && error.message ? error.message : String(error)
    });
  }
};
