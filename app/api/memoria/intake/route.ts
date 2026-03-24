import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordInsight } from '@/lib/memoria'
import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

const SYSTEM_PROMPT = `You are a business intelligence analyst specializing in small trade and service businesses. You are analyzing raw business data submitted by a contractor or service business owner. Your job is to extract meaningful business insights from whatever data is provided — even if it is messy, incomplete, or in an unusual format.

For each insight you identify respond with a JSON array of insight objects. Each object should have: category (one of: revenue, customer, reputation, marketing, operations, seasonal, behavioral), insight (the finding in plain English as if speaking directly to the business owner), confidence (low, medium, or high based on how clearly the data supports this), and dataPoints (how many data points support this finding).

Focus on insights that are actionable and specific to this business. Avoid generic observations. Every insight should tell the owner something they can act on.

Return only valid JSON. No preamble. No explanation outside the JSON array.`

interface InsightFromClaude {
  category: string
  insight: string
  confidence: 'low' | 'medium' | 'high'
  dataPoints: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, dataType, periodStart, periodEnd, rawData } = body

    if (!clientId || !dataType || !periodStart || !periodEnd || !rawData) {
      return NextResponse.json(
        { error: 'clientId, dataType, periodStart, periodEnd, and rawData are required' },
        { status: 400 }
      )
    }

    // Look up the client to get their trade/industry
    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Save the raw intake record
    const intake = await prisma.clientDataIntake.create({
      data: {
        clientId,
        dataType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        rawData,
      },
    })

    // Build the user prompt dynamically
    const userPrompt = `Analyze this business data for a ${client.industry} business and extract actionable intelligence insights.

Data type: ${dataType}
Period: ${periodStart} to ${periodEnd}

Raw data:
${typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2)}

Extract all meaningful insights. Focus on patterns, anomalies, profitability signals, customer behavior, seasonal trends, and strategic opportunities or risks.`

    // Call Claude
    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Extract text content from the response
    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      // Update intake as processed with zero insights
      await prisma.clientDataIntake.update({
        where: { id: intake.id },
        data: { status: 'processed', processedAt: new Date(), processedData: [], insightsCount: 0 },
      })
      return NextResponse.json({ intake, insightsCreated: 0, dataPoints: 0, categories: [] })
    }

    // Parse JSON from Claude's response
    let claudeInsights: InsightFromClaude[] = []
    try {
      // Try to extract JSON from the response — Claude sometimes wraps in markdown code blocks
      let jsonText = textBlock.text.trim()
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim()
      }
      claudeInsights = JSON.parse(jsonText)
      if (!Array.isArray(claudeInsights)) {
        claudeInsights = [claudeInsights]
      }
    } catch {
      // If JSON parsing fails, update intake as failed
      await prisma.clientDataIntake.update({
        where: { id: intake.id },
        data: { status: 'failed', processedAt: new Date(), processedData: { error: 'Failed to parse Claude response', raw: textBlock.text } },
      })
      return NextResponse.json({ intake, insightsCreated: 0, dataPoints: 0, categories: [], error: 'Failed to parse AI response' })
    }

    // Record each insight via the Memoria engine
    const validCategories = ['revenue', 'customer', 'reputation', 'marketing', 'operations', 'seasonal', 'behavioral']
    let insightsCreated = 0
    let totalDataPoints = 0
    const categoriesUsed = new Set<string>()

    for (const ci of claudeInsights) {
      if (!ci.category || !ci.insight) continue
      const category = validCategories.includes(ci.category) ? ci.category : 'operations'

      await recordInsight({
        clientId,
        category,
        insight: ci.insight,
        confidence: (['low', 'medium', 'high'].includes(ci.confidence) ? ci.confidence : 'low') as 'low' | 'medium' | 'high',
        source: `data-intake-${dataType}`,
        tradeVertical: client.industry,
      })

      insightsCreated++
      totalDataPoints += ci.dataPoints || 1
      categoriesUsed.add(category)
    }

    // Update the intake record as processed
    await prisma.clientDataIntake.update({
      where: { id: intake.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
        processedData: claudeInsights as unknown as Prisma.InputJsonValue,
        insightsCount: insightsCreated,
      },
    })

    return NextResponse.json({
      intake,
      insightsCreated,
      dataPoints: totalDataPoints,
      categories: [...categoriesUsed],
    })
  } catch (err) {
    console.error('Memoria intake error:', err)
    return NextResponse.json({ error: 'Failed to process intake data' }, { status: 500 })
  }
}
