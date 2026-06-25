// Vercel Serverless Function: GET /api/health
// Lekki health check dla uptime monitora (UptimeRobot / Better Stack).
// Zawsze zwraca 200 + JSON, bez żadnych sekretów ani zapytań do bazy — ma być szybki i tani.

export const config = { maxDuration: 5 };

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    service: 'lokalio-web',
    time: new Date().toISOString(),
  });
}
