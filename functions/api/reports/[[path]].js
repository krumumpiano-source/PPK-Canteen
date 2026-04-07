/* PPK-Canteen — Reports API */
export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (!['admin', 'executive', 'staff'].includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (path[0] === 'dashboard-stats' && method === 'GET') return dashboardStats(DB);
  if (path[0] === 'revenue' && method === 'GET') return revenueReport(DB, context.request);
  if (path[0] === 'bills' && method === 'GET') return billsReport(DB, context.request);
  if (path[0] === 'inspection' && method === 'GET') return inspectionReport(DB);
  if (path[0] === 'stalls' && method === 'GET') return stallsReport(DB);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function dashboardStats(DB) {
  const [totalStalls, occupiedStalls, pendingPayments, monthlyRevenue, avgInspection, totalRevenue] = await Promise.all([
    DB.prepare('SELECT COUNT(*) as c FROM stalls').first(),
    DB.prepare("SELECT COUNT(*) as c FROM stalls WHERE status = 'occupied'").first(),
    DB.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'pending'").first(),
    DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'verified' AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')").first(),
    DB.prepare('SELECT ROUND(AVG(score),1) as avg FROM inspections WHERE inspection_date >= date(\'now\', \'-90 days\')').first(),
    DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'verified'").first()
  ]);

  return Response.json({
    data: {
      total_stalls: totalStalls.c,
      occupied_stalls: occupiedStalls.c,
      pending_payments: pendingPayments.c,
      monthly_revenue: monthlyRevenue.total,
      avg_inspection: avgInspection.avg,
      total_revenue: totalRevenue.total
    }
  });
}

async function revenueReport(DB, request) {
  const { results } = await DB.prepare(
    `SELECT strftime('%Y-%m', p.paid_at) as month, SUM(p.amount) as total, COUNT(*) as count
     FROM payments p WHERE p.status = 'verified'
     GROUP BY strftime('%Y-%m', p.paid_at) ORDER BY month DESC LIMIT 12`
  ).all();
  return Response.json({ data: results });
}

async function billsReport(DB, request) {
  const { results } = await DB.prepare(
    `SELECT b.status, COUNT(*) as count, SUM(b.total_amount) as total
     FROM bills b GROUP BY b.status`
  ).all();
  return Response.json({ data: results });
}

async function inspectionReport(DB) {
  const { results } = await DB.prepare(
    `SELECT s.name as stall_name, i.inspection_date, i.score, i.result
     FROM inspections i JOIN stalls s ON i.stall_id = s.id
     ORDER BY i.inspection_date DESC LIMIT 50`
  ).all();
  return Response.json({ data: results });
}

async function stallsReport(DB) {
  const { results } = await DB.prepare(
    `SELECT s.*, c.tenant_name, c.end_date as contract_end,
     (SELECT MAX(inspection_date) FROM inspections WHERE stall_id = s.id) as last_inspection,
     (SELECT score FROM inspections WHERE stall_id = s.id ORDER BY inspection_date DESC LIMIT 1) as last_score
     FROM stalls s LEFT JOIN contracts c ON s.id = c.stall_id AND c.status = 'active'
     ORDER BY s.name`
  ).all();
  return Response.json({ data: results });
}
