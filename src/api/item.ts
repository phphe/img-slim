import { FastifyPluginCallback } from 'fastify'
import axios from 'axios'
import { Item } from '../models'
import { getRepository } from 'typeorm'
import * as tagServices from '../services/tag.service'
import { MD5 } from 'crypto-js'
import * as fs from 'fs'
import * as path from 'path'
import * as hp from 'helper-js'
import { wgetDownloadAndSave } from '../services/download.service'
import { spawnSync, exec, spawn } from 'child_process'

const routes: FastifyPluginCallback = function (app, opts, done) {
  app.post('/item_query', async (req) => {
    const repo = getRepository(Item)
    return repo.find()
  })
  app.get('/item_all_source', async (req) => {
    const repo = getRepository(Item)
    return (
      await repo.find({
        select: ['source'],
      })
    ).map((v) => v.source)
  })
  app.post('/item_get', async (req) => {
    const data: any = req.body
    const repo = getRepository(Item)
    const row = await repo.findOne({
      relations: ['tags'],
      where: {
        id: data.id,
      },
    })
    if (row) {
      if (row.meta) {
        row.meta = JSON.parse(row.meta)
      }
      if (row.others) {
        row.others = JSON.parse(row.others)
      }
      // @ts-ignore
      row.tags = row.tags.map((v) => v.name)
    }
    return row || ''
  })
  //
  app.post('/item_save', async (req) => {
    const repo = getRepository(Item)
    const data: any = req.body
    const others = JSON.stringify(data.others)
    const meta = JSON.stringify(data.meta || {})
    const tags = data.tags
    delete data.others
    delete data.tags
    const item = data.id ? await repo.findOne(data.id) : new Item()
    Object.assign(item, data)
    item.others = others
    item.meta = meta
    item.tags = await tagServices.getByNames(tags)
    await repo.save(item)
    return ''
  })
  //
  app.post('/item_remove', async (req) => {
    const repo = getRepository(Item)
    const data: any = req.body
    await repo.delete(data.id)
    return ''
  })
  //
  app.post('/item_open_archive', async (req) => {
    const repo = getRepository(Item)
    const data: any = req.body
    const { url } = data
    const key = MD5(url).toString()
    const oname = hp.arrayLast(url.split('/'))
    const dirPath = `./static/archive/${key}`
    const filePath = dirPath + '/' + oname
    const extractDirPath = dirPath + '/' + oname.split('.')[0]
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath)
      await wgetDownloadAndSave(url, filePath)
      spawnSync('unzip', ['-d', extractDirPath, filePath])
    }
    const absPath = path.join(process.cwd(), dirPath)
    return absPath
  })
  //
  app.post('/item_scrape', async (req) => {
    const data: any = req.body
    const html: string = (await axios.get(data.url)).data
    return html
  })
  //
  done()
}

export default routes
