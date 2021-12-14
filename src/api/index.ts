import { FastifyInstance } from "fastify";
import aws_s3 from "./aws_s3";

const prefix = "/";

export const initAPI = (app: FastifyInstance) => {
  app.get("/hello", (req, reply) => {
    reply.send("Hello world");
  });
  app.register(aws_s3, { prefix: prefix });
};
