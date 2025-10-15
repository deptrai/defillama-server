import * as HyperExpress from "hyper-express";
import * as sdk from '@defillama/sdk'

function getTimeInFutureMinutes(minutes: number) {
  const date = new Date();
  // add five minutes to the current time
  date.setMinutes(date.getMinutes() + minutes);
  return date.toUTCString()
}

export function successResponse(res: HyperExpress.Response, data: any, cacheMinutes: number = 30, {
  isJson = true,
  isPost = false,
} = {}) {
  res.setHeaders({
    "Expires": getTimeInFutureMinutes(cacheMinutes),
    "Cache-Control": `public, max-age=${cacheMinutes * 60}`
  })
  if (isPost) {
    res.removeHeader("Expires")
    res.removeHeader("Cache-Control")
  }

  isJson ? res.json(data) : res.send(data)
}

export function errorResponse(res: HyperExpress.Response, data: any = 'Internal server error', {
  statusCode = 400,
  cacheMinutes = 1, // Short cache for errors to prevent retry storms
} = {}) {
  // Set cache headers even for errors (short TTL)
  res.setHeaders({
    "Expires": getTimeInFutureMinutes(cacheMinutes),
    "Cache-Control": `public, max-age=${cacheMinutes * 60}`
  })
  res.status(statusCode)
  res.send(data, true)
}

export function errorWrapper(routeFn: any) {
  return async (req: HyperExpress.Request, res: HyperExpress.Response) => {
    try {
      await routeFn(req, res)
    } catch (e) {
      sdk.log(e)
      res.status(500)
      return res.send('Internal Error', true)
    }
  }
}