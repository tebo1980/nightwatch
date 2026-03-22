import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import React from 'react'
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// ─── Supabase client (lazy init to avoid build-time crash) ──────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY')
  return createClient(url, key)
}

// ─── Types ──────────────────────────────────────────────────────

interface LineItem {
  name: string
  unit: string
  unitPrice: number
  quantity: number
  total: number
}

// ─── PDF Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  businessName: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  businessDetail: { fontSize: 9, color: '#555', marginBottom: 1 },
  estimateLabel: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#C17B2A' },
  estimateNum: { fontSize: 11, color: '#555', marginTop: 2 },
  dateText: { fontSize: 9, color: '#555', marginTop: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginVertical: 14 },
  twoCol: { flexDirection: 'row', gap: 20 },
  colHalf: { flex: 1 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  boldText: { fontFamily: 'Helvetica-Bold' },
  normalText: { fontSize: 10, marginBottom: 2 },
  smallText: { fontSize: 9, color: '#555', marginBottom: 1 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 6, paddingHorizontal: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 5, paddingHorizontal: 8 },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#fafafa' },
  colDesc: { flex: 3 },
  colQty: { width: 40, textAlign: 'center' },
  colUnit: { width: 50, textAlign: 'center' },
  colPrice: { width: 70, textAlign: 'right' },
  colTotal: { width: 70, textAlign: 'right' },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase' },
  tdText: { fontSize: 9 },
  // Totals
  totalsRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8 },
  totalLabel: { flex: 1, textAlign: 'right', paddingRight: 10 },
  totalValue: { width: 70, textAlign: 'right' },
  grandTotal: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#FFF8F0', borderTopWidth: 2, borderTopColor: '#C17B2A' },
  grandTotalLabel: { flex: 1, textAlign: 'right', paddingRight: 10, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  grandTotalValue: { width: 70, textAlign: 'right', fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#C17B2A' },
  // Terms
  termLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 6, marginBottom: 2 },
  termText: { fontSize: 9, color: '#444', lineHeight: 1.4 },
  // Footer
  footer: { marginTop: 'auto', paddingTop: 16 },
  footerThank: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  footerContact: { fontSize: 9, color: '#555', textAlign: 'center', marginBottom: 8 },
  footerPowered: { fontSize: 7, color: '#aaa', textAlign: 'center' },
})

// ─── PDF Document component ────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EstimatePDF({ estimate, config }: {
  estimate: {
    estimateNumber: string
    customerName: string
    customerPhone: string
    customerEmail: string | null
    customerAddress: string
    jobType: string
    jobDescription: string
    lineItems: LineItem[]
    laborHours: number
    laborRate: number
    laborTotal: number
    materialsTotal: number
    subtotal: number
    taxAmount: number
    totalAmount: number
    depositRequired: number
    validUntil: Date
    createdAt: Date
  }
  config: {
    businessName: string
    businessPhone: string
    businessEmail: string
    businessAddress: string | null
    licenseNumber: string | null
    insuranceInfo: string | null
    taxRate: number
    paymentTerms: string
    warrantyTerms: string
    validityDays: number
    escalationClause: boolean
  }
}) {
  const issuedDate = new Date(estimate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const validDate = new Date(estimate.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const items: LineItem[] = Array.isArray(estimate.lineItems) ? estimate.lineItems : []

  return React.createElement(Document, {},
    React.createElement(Page, { size: 'LETTER', style: s.page },

      // ─── HEADER
      React.createElement(View, { style: s.header },
        React.createElement(View, { style: s.headerLeft },
          React.createElement(Text, { style: s.businessName }, config.businessName),
          React.createElement(Text, { style: s.businessDetail }, `${config.businessPhone}  |  ${config.businessEmail}`),
          config.businessAddress ? React.createElement(Text, { style: s.businessDetail }, config.businessAddress) : null,
          config.licenseNumber ? React.createElement(Text, { style: s.businessDetail }, `License: ${config.licenseNumber}`) : null,
          config.insuranceInfo ? React.createElement(Text, { style: s.businessDetail }, `Insured: ${config.insuranceInfo}`) : null,
        ),
        React.createElement(View, { style: s.headerRight },
          React.createElement(Text, { style: s.estimateLabel }, 'ESTIMATE'),
          React.createElement(Text, { style: s.estimateNum }, `#${estimate.estimateNumber}`),
          React.createElement(Text, { style: s.dateText }, `Issued: ${issuedDate}`),
          React.createElement(Text, { style: s.dateText }, `Valid until: ${validDate}`),
        ),
      ),

      // ─── DIVIDER
      React.createElement(View, { style: s.divider }),

      // ─── CUSTOMER + JOB
      React.createElement(View, { style: s.twoCol },
        React.createElement(View, { style: s.colHalf },
          React.createElement(Text, { style: s.sectionLabel }, 'Prepared For'),
          React.createElement(Text, { style: { ...s.normalText, ...s.boldText } }, estimate.customerName),
          React.createElement(Text, { style: s.smallText }, estimate.customerPhone),
          estimate.customerEmail ? React.createElement(Text, { style: s.smallText }, estimate.customerEmail) : null,
        ),
        React.createElement(View, { style: s.colHalf },
          React.createElement(Text, { style: s.sectionLabel }, 'Job Location'),
          React.createElement(Text, { style: { ...s.normalText, ...s.boldText } }, estimate.customerAddress),
          React.createElement(Text, { style: { ...s.normalText, ...s.boldText, marginTop: 4 } }, estimate.jobType),
          React.createElement(Text, { style: s.smallText }, estimate.jobDescription),
        ),
      ),

      // ─── DIVIDER
      React.createElement(View, { style: s.divider }),

      // ─── TABLE HEADER
      React.createElement(View, { style: s.tableHeader },
        React.createElement(Text, { style: { ...s.thText, ...s.colDesc } }, 'Description'),
        React.createElement(Text, { style: { ...s.thText, ...s.colQty } }, 'Qty'),
        React.createElement(Text, { style: { ...s.thText, ...s.colUnit } }, 'Unit'),
        React.createElement(Text, { style: { ...s.thText, ...s.colPrice } }, 'Unit Price'),
        React.createElement(Text, { style: { ...s.thText, ...s.colTotal } }, 'Total'),
      ),

      // ─── MATERIAL ROWS
      ...items.map((item: LineItem, i: number) =>
        React.createElement(View, { key: `item-${i}`, style: i % 2 === 1 ? s.tableRowAlt : s.tableRow },
          React.createElement(Text, { style: { ...s.tdText, ...s.colDesc } }, item.name),
          React.createElement(Text, { style: { ...s.tdText, ...s.colQty } }, String(item.quantity)),
          React.createElement(Text, { style: { ...s.tdText, ...s.colUnit } }, item.unit),
          React.createElement(Text, { style: { ...s.tdText, ...s.colPrice } }, `$${fmt(item.unitPrice)}`),
          React.createElement(Text, { style: { ...s.tdText, ...s.colTotal } }, `$${fmt(item.total)}`),
        )
      ),

      // ─── LABOR ROW
      React.createElement(View, { style: items.length % 2 === 1 ? s.tableRowAlt : s.tableRow },
        React.createElement(Text, { style: { ...s.tdText, ...s.colDesc } }, `Labor (${estimate.laborHours} hours)`),
        React.createElement(Text, { style: { ...s.tdText, ...s.colQty } }, String(estimate.laborHours)),
        React.createElement(Text, { style: { ...s.tdText, ...s.colUnit } }, 'hrs'),
        React.createElement(Text, { style: { ...s.tdText, ...s.colPrice } }, `$${fmt(estimate.laborRate)}/hr`),
        React.createElement(Text, { style: { ...s.tdText, ...s.colTotal } }, `$${fmt(estimate.laborTotal)}`),
      ),

      // ─── SUBTOTAL
      React.createElement(View, { style: s.totalsRow },
        React.createElement(Text, { style: { ...s.totalLabel, fontFamily: 'Helvetica-Bold', fontSize: 10 } }, 'Subtotal'),
        React.createElement(Text, { style: { ...s.totalValue, fontFamily: 'Helvetica-Bold', fontSize: 10 } }, `$${fmt(estimate.subtotal)}`),
      ),

      // ─── TAX (conditional)
      ...(config.taxRate > 0 ? [
        React.createElement(View, { key: 'tax', style: s.totalsRow },
          React.createElement(Text, { style: { ...s.totalLabel, fontSize: 10 } }, `Tax (${config.taxRate}%)`),
          React.createElement(Text, { style: { ...s.totalValue, fontSize: 10 } }, `$${fmt(estimate.taxAmount)}`),
        ),
      ] : []),

      // ─── GRAND TOTAL
      React.createElement(View, { style: s.grandTotal },
        React.createElement(Text, { style: s.grandTotalLabel }, 'TOTAL'),
        React.createElement(Text, { style: s.grandTotalValue }, `$${fmt(estimate.totalAmount)}`),
      ),

      // ─── DIVIDER
      React.createElement(View, { style: s.divider }),

      // ─── TERMS
      React.createElement(View, {},
        React.createElement(Text, { style: s.sectionLabel }, 'Terms & Conditions'),
        React.createElement(Text, { style: s.termLabel }, 'Deposit Required:'),
        React.createElement(Text, { style: s.termText }, `$${fmt(estimate.depositRequired)}`),
        React.createElement(Text, { style: s.termLabel }, 'Payment Terms:'),
        React.createElement(Text, { style: s.termText }, config.paymentTerms),
        React.createElement(Text, { style: s.termLabel }, 'Warranty:'),
        React.createElement(Text, { style: s.termText }, config.warrantyTerms),
        ...(config.escalationClause ? [
          React.createElement(Text, { key: 'esc-label', style: s.termLabel }, 'Price Validity:'),
          React.createElement(Text, { key: 'esc-text', style: s.termText },
            `Material prices are subject to change. This estimate is valid for ${config.validityDays} days from the date issued.`
          ),
        ] : []),
      ),

      // ─── DIVIDER
      React.createElement(View, { style: s.divider }),

      // ─── FOOTER
      React.createElement(View, { style: s.footer },
        React.createElement(Text, { style: s.footerThank }, `Thank you for considering ${config.businessName}.`),
        React.createElement(Text, { style: s.footerContact }, `${config.businessPhone}  |  ${config.businessEmail}`),
        React.createElement(Text, { style: s.footerPowered }, 'Powered by BaraTrust  |  baratrust.com'),
      ),
    )
  )
}

// ─── Route handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { estimateId } = await req.json()

    if (!estimateId) {
      return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { boltConfig: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const config = estimate.boltConfig

    // Generate PDF buffer
    const pdfData = {
      ...estimate,
      lineItems: (Array.isArray(estimate.lineItems) ? estimate.lineItems : []) as unknown as LineItem[],
    }
    const pdfBuffer = await renderToBuffer(
      EstimatePDF({ estimate: pdfData, config })
    )

    // Upload to Supabase Storage
    const filePath = `${estimate.clientId}/${estimate.estimateNumber}.pdf`

    const supabase = getSupabase()
    const { error: uploadError } = await supabase.storage
      .from('estimates')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('estimates')
      .getPublicUrl(filePath)

    const pdfUrl = urlData.publicUrl

    // Update estimate record with PDF URL
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { pdfUrl },
    })

    return NextResponse.json({ success: true, pdfUrl })
  } catch (error) {
    console.error('POST /api/bolt/generate-pdf error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    }, { status: 500 })
  }
}
