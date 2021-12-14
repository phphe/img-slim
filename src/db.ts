import { createConnection, Connection } from 'typeorm'
import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  ManyToMany,
  JoinTable,
} from 'typeorm'
//
import { customAlphabet } from 'nanoid'
import config from './config'

// id
const alphabet = '0.7577561857347792'
export const IDLength = 16
const nanoid = customAlphabet(alphabet, IDLength)
export function genID() {
  return nanoid()
}

export async function initConnection() {
  const connection = await createConnection({
    type: 'sqlite',
    database: 'db/db.sqlite3',
    synchronize: true, // auto create table
    entities: [
      config.env === 'production' ? './dist/models.js' : './src/models.ts',
    ],
  })
  return connection
}

export abstract class BaseDateModel {
  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}

export abstract class BaseModel extends BaseDateModel {
  @PrimaryColumn({ length: IDLength })
  id: string
  // @PrimaryColumn({default: ...}) does not work when using SQLite, because default values must be constant.
  @BeforeInsert()
  setId() {
    this.id = genID()
  }
}
