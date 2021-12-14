import { FastifyPluginCallback } from 'fastify'
import { MD5 } from 'crypto-js'
import * as fs from 'fs'
import { getType, getExtension } from 'mime'
import { wgetDownloadAndSave } from '../services/download.service'

const routes: FastifyPluginCallback = function (app, opts, done) {
  app.get('/localize', async (req, reply) => {
    // @ts-ignore
    const url = req.query.url as string
    if (!url) {
      return null
    }
    const key = MD5(url).toString()
    let type = getType(url)
    const ext = getExtension(type)
    type = type.split('/')[0]
    if (type.startsWith('image')) {
      type = 'img'
    }
    const filePath = `./static/${type}/${key}.${ext}`
    if (!fs.existsSync(filePath)) {
      await wgetDownloadAndSave(url, filePath)
    }
    reply.code(302).redirect(filePath.replace(/^\./, ''))
  })
  //
  done()
}

export default routes
