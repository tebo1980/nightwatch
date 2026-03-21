import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (!credentialsJson) {
      return NextResponse.json({ success: false, error: 'Google credentials not configured' }, { status: 500 })
    }

    const credentials = JSON.parse(credentialsJson)

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const row = [
      body.clientName,
      body.reportMonth,
      body.reportYear,
      body.totalCallsThisMonth,
      body.totalCallsLastMonth,
      body.costPerCall,
      body.healthScoreThisMonth,
      body.healthScoreLastMonth,
      body.guaranteeCallsToDate,
      body.daysRemainingInGuarantee,
      body.topCallSource,
      body.facebookAdSpend,
      body.googleAdSpend,
      body.weakestCategory,
      new Date().toISOString(),
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: '1HnC37IadK-ZYBTopMBF-wWTEE-Fi2w77mXGDWODfILs',
      range: 'Monthly_Stats!A:O',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sheets write error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
