import { FastifyInstance } from 'fastify'
import staticPlugin from 'fastify-static'
import * as path from 'path'
import * as fs from 'fs'

export function initFrontendDist(app: FastifyInstance) {
  app.get('/item/:any', (req, reply) => {
    reply.sendFile('./frontend-dist/index.html', process.cwd())
  })
  app.register(staticPlugin, {
    root: path.join(process.cwd(), './frontend-dist'),
    prefix: '/', // optional: default '/'
    decorateReply: false,
  })
}
