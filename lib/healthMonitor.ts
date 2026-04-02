import { prisma } from './prisma'

// ─── Alert Code Definitions ────────────────────────────────────

export type AlertCode =
  | 'CALLS_DOWN_20PCT'
  | 'GUARANTEE_AT_RISK'
  | 'GUARANTEE_ACHIEVED'
  | 'HEALTH_SCORE_DROP'
  | 'TERM_ENDING_60'
  | 'TERM_ENDING_30'
  | 'PAYMENT_OVERDUE'

export interface ClientHealthResult {
  clientId: string
  businessName: string
  ownerName: string
  ownerEmail: string
  alerts: AlertCode[]
  callsThisMonth: number
  callsLastMonth: number
  guaranteeCallCount: number
  guaranteeDaysRemaining: number | null
  healthScore: number | null
  tier: string
}

export interface HealthCheckSummary {
  totalClients: number
  clientsWithAlerts: number
  results: ClientHealthResult[]
  alertCounts: Record<AlertCode, number>
  timestamp: string
}

// ─── Main Health Check Runner ──────────────────────────────────

export async function runHealthChecks(): Promise<HealthCheckSummary> {
  const clients = await prisma.agentClient.findMany({
    where: { active: true },
  })

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const alertCounts: Record<AlertCode, number> = {
    CALLS_DOWN_20PCT: 0,
    GUARANTEE_AT_RISK: 0,
    GUARANTEE_ACHIEVED: 0,
    HEALTH_SCORE_DROP: 0,
    TERM_ENDING_60: 0,
    TERM_ENDING_30: 0,
    PAYMENT_OVERDUE: 0,
  }

  const results: ClientHealthResult[] = []

  for (const client of clients) {
    const alerts: AlertCode[] = []

    // ── Call data from IrisLead + Lead tables ──────────────────
    // Count leads/calls this month vs last month as a proxy for call volume.
    // In production this would integrate with CallRail API; for now we use
    // lead creation timestamps as our best available signal.

    const callsThisMonth = await prisma.irisLead.count({
      where: {
        clientId: client.id,
        createdAt: { gte: thisMonthStart },
      },
    })

    const callsLastMonth = await prisma.irisLead.count({
      where: {
        clientId: client.id,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    })

    // ── Alert: Calls dropped 20%+ MoM ────────────────────────
    if (callsLastMonth > 0) {
      const dropPct = ((callsLastMonth - callsThisMonth) / callsLastMonth) * 100
      if (dropPct >= 20) {
        alerts.push('CALLS_DOWN_20PCT')
      }
    }

    // ── Guarantee tracking ───────────────────────────────────
    const target = client.monthlyCallTarget || 10
    const termEnd = client.termEndDate
    let daysRemaining: number | null = null

    if (termEnd) {
      daysRemaining = Math.ceil((termEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // GUARANTEE_AT_RISK: <7 calls with <30 days remaining
      if (callsThisMonth < 7 && daysRemaining > 0 && daysRemaining < 30) {
        alerts.push('GUARANTEE_AT_RISK')
      }

      // GUARANTEE_ACHIEVED: hit monthly call target
      if (callsThisMonth >= target && (client.guaranteeCallCount || 0) < target) {
        alerts.push('GUARANTEE_ACHIEVED')
      }

      // TERM_ENDING alerts
      if (daysRemaining > 0 && daysRemaining <= 30) {
        alerts.push('TERM_ENDING_30')
      } else if (daysRemaining > 30 && daysRemaining <= 60) {
        alerts.push('TERM_ENDING_60')
      }
    }

    // ── Health Score tracking ────────────────────────────────
    // Pull latest Memoria insights for health score changes
    const latestInsights = await prisma.clientIntelligence.findMany({
      where: {
        clientId: client.id,
        category: 'health_score',
        isActive: true,
      },
      orderBy: { lastConfirmed: 'desc' },
      take: 2,
    })

    let healthScore: number | null = null
    if (latestInsights.length >= 1) {
      const current = parseFloat(latestInsights[0].insight) || 0
      healthScore = current
      if (latestInsights.length >= 2) {
        const previous = parseFloat(latestInsights[1].insight) || 0
        if (previous - current >= 10) {
          alerts.push('HEALTH_SCORE_DROP')
        }
      }
    }

    // ── Payment overdue check ───────────────────────────────
    const overdueInvoices = await prisma.maxInvoice.count({
      where: {
        clientId: client.id,
        status: 'unpaid',
        dueDate: {
          lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    })

    if (overdueInvoices > 0) {
      alerts.push('PAYMENT_OVERDUE')
    }

    // ── Update client record ────────────────────────────────
    await prisma.agentClient.update({
      where: { id: client.id },
      data: {
        lastHealthCheck: now,
        healthAlertFlags: alerts,
        guaranteeCallCount: callsThisMonth,
        guaranteeDaysRemaining: daysRemaining,
      },
    })

    // Count alerts
    for (const a of alerts) {
      alertCounts[a]++
    }

    results.push({
      clientId: client.id,
      businessName: client.businessName,
      ownerName: client.ownerName,
      ownerEmail: client.ownerEmail,
      alerts,
      callsThisMonth,
      callsLastMonth,
      guaranteeCallCount: callsThisMonth,
      guaranteeDaysRemaining: daysRemaining,
      healthScore,
      tier: client.tier,
    })
  }

  return {
    totalClients: clients.length,
    clientsWithAlerts: results.filter((r) => r.alerts.length > 0).length,
    results,
    alertCounts,
    timestamp: now.toISOString(),
  }
}

// ─── Format digest email ───────────────────────────────────────

const ALERT_LABELS: Record<AlertCode, string> = {
  CALLS_DOWN_20PCT: 'Calls down 20%+ month-over-month',
  GUARANTEE_AT_RISK: 'Guarantee at risk (<7 calls, <30 days left)',
  GUARANTEE_ACHIEVED: 'Guarantee achieved!',
  HEALTH_SCORE_DROP: 'Health Score dropped 10+ points',
  TERM_ENDING_60: 'Term ending in 60 days',
  TERM_ENDING_30: 'Term ending in 30 days',
  PAYMENT_OVERDUE: 'Payment overdue (7+ days)',
}

export function formatDigestEmail(summary: HealthCheckSummary): { subject: string; html: string; text: string } {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const alertCount = summary.clientsWithAlerts
  const subject = `BaraTrust Daily — ${date} — ${alertCount} alert${alertCount !== 1 ? 's' : ''}`

  // ── Plain text version ────────────────────────────────────
  let text = `BaraTrust Daily Health Check — ${date}\n\n`

  if (alertCount > 0) {
    text += '=== ALERTS REQUIRING ATTENTION ===\n\n'
    for (const r of summary.results.filter((r) => r.alerts.length > 0)) {
      text += `${r.businessName} (${r.ownerName})\n`
      for (const a of r.alerts) {
        text += `  ⚠ ${ALERT_LABELS[a]}\n`
      }
      text += `  Dashboard: https://nightwatch.baratrust.com/agent-clients/${r.clientId}\n\n`
    }
  } else {
    text += 'All clients healthy. Nothing needs your attention today.\n\n'
  }

  text += '=== ALL CLIENTS STATUS ===\n\n'
  for (const r of summary.results) {
    const status = r.alerts.length > 0 ? `⚠ ${r.alerts.length} alert(s)` : '✓ Healthy'
    text += `${r.businessName} | ${r.callsThisMonth} calls this month | HS: ${r.healthScore ?? 'N/A'} | ${status}\n`
  }

  text += '\n=== GUARANTEE TRACKER ===\n\n'
  for (const r of summary.results) {
    const days = r.guaranteeDaysRemaining !== null ? `${r.guaranteeDaysRemaining} days remaining` : 'No term set'
    text += `${r.businessName} | ${r.guaranteeCallCount}/10 calls | ${days}\n`
  }

  // ── HTML version ──────────────────────────────────────────
  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; background: #0E0C0A; color: #F2EDE4; padding: 32px;">
      <div style="border-bottom: 2px solid #C17B2A; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="color: #C17B2A; margin: 0; font-size: 22px;">BaraTrust Daily Health Check</h1>
        <p style="color: #8A8070; margin: 4px 0 0; font-size: 13px;">${date} &mdash; ${summary.totalClients} clients monitored</p>
      </div>`

  if (alertCount > 0) {
    html += `
      <div style="background: #1E1B16; border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #EF4444; font-size: 15px; margin: 0 0 16px;">⚠ Alerts Requiring Attention (${alertCount})</h2>`

    for (const r of summary.results.filter((r) => r.alerts.length > 0)) {
      html += `
        <div style="border-bottom: 1px solid rgba(138,128,112,0.2); padding: 12px 0;">
          <div style="font-weight: 600; font-size: 14px;">${r.businessName}</div>
          <div style="color: #8A8070; font-size: 12px; margin-bottom: 6px;">${r.ownerName} &mdash; ${r.tier}</div>`
      for (const a of r.alerts) {
        const isGood = a === 'GUARANTEE_ACHIEVED'
        const color = isGood ? '#22C55E' : '#EF4444'
        html += `<div style="color: ${color}; font-size: 13px; padding: 2px 0;">• ${ALERT_LABELS[a]}</div>`
      }
      html += `
          <a href="https://nightwatch.baratrust.com" style="color: #C17B2A; font-size: 12px; text-decoration: none;">View Dashboard →</a>
        </div>`
    }
    html += `</div>`
  } else {
    html += `
      <div style="background: #1E1B16; border: 1px solid rgba(34,197,94,0.3); border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 8px;">✓</div>
        <div style="color: #22C55E; font-weight: 600;">All clients healthy</div>
        <div style="color: #8A8070; font-size: 13px;">Nothing needs your attention today.</div>
      </div>`
  }

  // All clients table
  html += `
    <div style="background: #1E1B16; border: 1px solid rgba(193,123,42,0.15); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #F2EDE4; font-size: 15px; margin: 0 0 16px;">All Clients Status</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid rgba(138,128,112,0.2);">
          <th style="text-align: left; padding: 8px 4px; color: #8A8070; font-weight: 500;">Client</th>
          <th style="text-align: center; padding: 8px 4px; color: #8A8070; font-weight: 500;">Calls</th>
          <th style="text-align: center; padding: 8px 4px; color: #8A8070; font-weight: 500;">Health</th>
          <th style="text-align: right; padding: 8px 4px; color: #8A8070; font-weight: 500;">Status</th>
        </tr>`

  for (const r of summary.results) {
    const statusColor = r.alerts.length > 0 ? '#EF4444' : '#22C55E'
    const statusText = r.alerts.length > 0 ? `⚠ ${r.alerts.length}` : '✓'
    html += `
        <tr style="border-bottom: 1px solid rgba(138,128,112,0.1);">
          <td style="padding: 8px 4px;">${r.businessName}</td>
          <td style="text-align: center; padding: 8px 4px; color: #C17B2A;">${r.callsThisMonth}</td>
          <td style="text-align: center; padding: 8px 4px;">${r.healthScore ?? '—'}</td>
          <td style="text-align: right; padding: 8px 4px; color: ${statusColor};">${statusText}</td>
        </tr>`
  }

  html += `</table></div>`

  // Guarantee tracker
  html += `
    <div style="background: #1E1B16; border: 1px solid rgba(193,123,42,0.15); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="color: #F2EDE4; font-size: 15px; margin: 0 0 16px;">Guarantee Tracker</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid rgba(138,128,112,0.2);">
          <th style="text-align: left; padding: 8px 4px; color: #8A8070; font-weight: 500;">Client</th>
          <th style="text-align: center; padding: 8px 4px; color: #8A8070; font-weight: 500;">Calls</th>
          <th style="text-align: right; padding: 8px 4px; color: #8A8070; font-weight: 500;">Days Left</th>
        </tr>`

  for (const r of summary.results) {
    const callColor = r.guaranteeCallCount >= 10 ? '#22C55E' : r.guaranteeCallCount >= 7 ? '#C17B2A' : '#F2EDE4'
    const daysText = r.guaranteeDaysRemaining !== null ? `${r.guaranteeDaysRemaining}d` : '—'
    html += `
        <tr style="border-bottom: 1px solid rgba(138,128,112,0.1);">
          <td style="padding: 8px 4px;">${r.businessName}</td>
          <td style="text-align: center; padding: 8px 4px; color: ${callColor}; font-weight: 600;">${r.guaranteeCallCount}/10</td>
          <td style="text-align: right; padding: 8px 4px;">${daysText}</td>
        </tr>`
  }

  html += `</table></div>`

  // Footer
  html += `
      <div style="text-align: center; color: #8A8070; font-size: 11px; padding-top: 16px; border-top: 1px solid rgba(138,128,112,0.15);">
        <div>Powered by BaraTrust Nightwatch</div>
        <div style="margin-top: 4px;">nightwatch.baratrust.com</div>
      </div>
    </div>`

  return { subject, html, text }
}
