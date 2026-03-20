import { prisma } from './prisma'
import { AgentClient } from '@prisma/client'

export async function scrapeGoogleReviews(client: AgentClient): Promise<number> {
  if (!client.googlePlaceId) return 0

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_PLACES_API_KEY not set')
    return 0
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(client.googlePlaceId)}&fields=reviews&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()

    if (!data.result?.reviews) return 0

    let newCount = 0
    for (const review of data.result.reviews) {
      const externalId = `google_${review.time}_${review.author_name.replace(/\s/g, '_')}`

      const existing = await prisma.review.findUnique({
        where: {
          clientId_platform_externalId: {
            clientId: client.id,
            platform: 'google',
            externalId,
          },
        },
      })

      if (!existing) {
        await prisma.review.create({
          data: {
            clientId: client.id,
            platform: 'google',
            externalId,
            reviewerName: review.author_name,
            rating: review.rating,
            reviewText: review.text || '(No text provided)',
            reviewDate: new Date(review.time * 1000),
            status: 'pending',
          },
        })
        newCount++
      }
    }

    await prisma.agentClient.update({
      where: { id: client.id },
      data: { rexLastScrapeAt: new Date() },
    })

    return newCount
  } catch (error) {
    console.error(`Google scrape error for ${client.businessName}:`, error)
    return 0
  }
}

export async function scrapeYelpReviews(client: AgentClient): Promise<number> {
  if (!client.yelpBusinessId) return 0

  const apiKey = process.env.YELP_API_KEY
  if (!apiKey) {
    console.warn('YELP_API_KEY not set')
    return 0
  }

  try {
    const url = `https://api.yelp.com/v3/businesses/${encodeURIComponent(client.yelpBusinessId)}/reviews?limit=20&sort_by=yelp_sort`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await res.json()

    if (!data.reviews) return 0

    let newCount = 0
    for (const review of data.reviews) {
      const existing = await prisma.review.findUnique({
        where: {
          clientId_platform_externalId: {
            clientId: client.id,
            platform: 'yelp',
            externalId: review.id,
          },
        },
      })

      if (!existing) {
        await prisma.review.create({
          data: {
            clientId: client.id,
            platform: 'yelp',
            externalId: review.id,
            reviewerName: review.user?.name || 'A customer',
            rating: review.rating,
            reviewText: review.text || '(No text provided)',
            reviewDate: new Date(review.time_created),
            status: 'pending',
          },
        })
        newCount++
      }
    }

    return newCount
  } catch (error) {
    console.error(`Yelp scrape error for ${client.businessName}:`, error)
    return 0
  }
}
