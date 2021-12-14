import { FastifyInstance } from 'fastify'
import aws_s3 from './aws_s3'

const prefix = '/'

export const initAPI = (app: FastifyInstance) => {
  app.register(aws_s3, { prefix: prefix })
}
