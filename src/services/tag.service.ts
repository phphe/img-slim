import { Tag } from '../models'
import { In, getRepository } from 'typeorm'
import * as hp from 'helper-js'

// create new if not exists
export async function getByNames(names: string[]) {
  const repo = getRepository(Tag)
  names = hp.arrayDistinct(names)
  const rows = await repo.find({ name: In(names) })
  const existingNames = new Set(rows.map((v) => v.name))
  if (existingNames.size !== names.length) {
    const newTags = []
    for (const name of names) {
      if (!existingNames.has(name)) {
        const tag = new Tag()
        tag.name = name
        rows.push(tag)
        newTags.push(tag)
      }
    }
    await repo.save(newTags)
  }
  return rows
}
