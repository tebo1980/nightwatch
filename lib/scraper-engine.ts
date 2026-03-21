import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export async function scrapeTarget(url: string, selector: string): Promise<{
  success: boolean
  result?: string
  error?: string
}> {
  let browser = null
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    await page.waitForSelector(selector, { timeout: 10000 })

    const result = await page.$eval(selector, (el) => el.textContent?.trim())

    return { success: true, result: result || '' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    if (browser) await browser.close()
  }
}

export function parsePrice(rawText: string): number | null {
  const cleaned = rawText.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}
