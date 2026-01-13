import type { VercelRequest, VercelResponse } from 'vercel'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { path = [] } = req.query
    const queryString = req.url?.split('?')[1]
    const apiPath = Array.isArray(path) ? path.join('/') : path

    const url =
      `https://openapi.koreainvestment.com:9443/uapi/${apiPath}` +
      (queryString ? `?${queryString}` : '')

    const response = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers,
        host: 'openapi.koreainvestment.com',
      },
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : JSON.stringify(req.body),
    })

    const text = await response.text()

    res.status(response.status).send(text)
  } catch (e: any) {
    console.error('❌ KIS Proxy Error', e)
    res.status(500).json({ error: 'KIS Proxy Failed' })
  }
}
