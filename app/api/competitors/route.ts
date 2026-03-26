import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// GET — List all competitors
export async function GET() {
  try {
    const competitors = await prisma.competitorIntel.findMany({
      orderBy: { competitorName: 'asc' },
    })
    return NextResponse.json({ competitors })
  } catch (error) {
    console.error('Competitors GET error:', error)
    return NextResponse.json({ error: 'Failed to load competitors' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── Generate talking points ──────────────────────────────
    if (body.action === 'generate_talking_points') {
      const { competitor, baraTrustTier, prospectTrade } = body

      const systemPrompt = `You are a sales coach for BaraTrust. You generate honest, specific, non-aggressive talking points that help Todd explain why BaraTrust is a better choice than a specific competitor. Never trash the competitor. Focus on what BaraTrust does that the competitor does not. Be specific and factual based on the data provided. Write in plain conversational language Todd can use naturally in a phone or text conversation.`

      const tierFeatures: Record<string, string> = {
        'Starter': 'Nova website agent, Rex review management, basic lead follow-up. $299/mo, no contract, no setup fee.',
        'Complete': 'Full AI staff: Nova, Rex, Iris, Max, Della, Sage, Flynn, Cole, River, Atlas, Bolt estimate builder, Memoria intelligence. $599/mo, no contract, no setup fee, includes all agents and monthly intelligence briefs.',
        'Agents Only': 'Selected agents based on client needs. $399/mo, no contract, flexible agent selection.',
      }

      const compData = [
        `Competitor: ${competitor.competitorName}`,
        competitor.website ? `Website: ${competitor.website}` : '',
        competitor.monthlyPriceMin || competitor.monthlyPriceMax
          ? `Price: $${competitor.monthlyPriceMin || '?'}-$${competitor.monthlyPriceMax || '?'}/mo`
          : '',
        competitor.setupFee ? `Setup fee: $${competitor.setupFee}` : '',
        competitor.contractLength ? `Contract: ${competitor.contractLength}` : '',
        competitor.guaranteeOffered ? `Guarantee: ${competitor.guaranteeDetails || 'Yes'}` : 'No guarantee offered',
        competitor.keyFeatures ? `Key features: ${competitor.keyFeatures}` : '',
        competitor.weaknesses ? `Known weaknesses: ${competitor.weaknesses}` : '',
        competitor.clientComplaints ? `Client complaints: ${competitor.clientComplaints}` : '',
      ].filter(Boolean).join('\n')

      const userPrompt = `Generate five specific talking points Todd can use when a prospect mentions ${competitor.competitorName} by name.

Competitor data:
${compData}

BaraTrust offering (${baraTrustTier} tier):
${tierFeatures[baraTrustTier] || tierFeatures['Complete']}

${prospectTrade ? `The prospect is a ${prospectTrade}.` : ''}

Give five numbered talking points. Each should be 1-2 sentences max. Focus on real differences Todd can bring up naturally in conversation.`

      const message = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      return NextResponse.json({ talkingPoints: text })
    }

    // ─── Save or update competitor ────────────────────────────
    if (body.action === 'save') {
      const {
        id, competitorName, website, monthlyPriceMin, monthlyPriceMax,
        setupFee, contractLength, guaranteeOffered, guaranteeDetails,
        keyFeatures, weaknesses, clientComplaints, notes,
      } = body

      if (!competitorName) {
        return NextResponse.json({ error: 'competitorName required' }, { status: 400 })
      }

      const data = {
        competitorName,
        website: website || null,
        monthlyPriceMin: monthlyPriceMin ? parseFloat(monthlyPriceMin) : null,
        monthlyPriceMax: monthlyPriceMax ? parseFloat(monthlyPriceMax) : null,
        setupFee: setupFee ? parseFloat(setupFee) : null,
        contractLength: contractLength || null,
        guaranteeOffered: guaranteeOffered || false,
        guaranteeDetails: guaranteeDetails || null,
        keyFeatures: keyFeatures || null,
        weaknesses: weaknesses || null,
        clientComplaints: clientComplaints || null,
        notes: notes || null,
        lastUpdated: new Date(),
      }

      if (id) {
        const competitor = await prisma.competitorIntel.update({ where: { id }, data })
        return NextResponse.json({ competitor })
      }

      const competitor = await prisma.competitorIntel.create({ data })
      return NextResponse.json({ competitor })
    }

    // ─── Delete competitor ────────────────────────────────────
    if (body.action === 'delete') {
      await prisma.competitorIntel.delete({ where: { id: body.id } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Competitors POST error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
