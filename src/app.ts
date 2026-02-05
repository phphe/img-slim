import "./misc/dotenv_init";
import { fastify, FastifyInstance } from "fastify";
import cors from "fastify-cors";
import staticPlugin from "fastify-static";
import { initAPI } from "./api/index";
// import { initFrontendDist } from './frontend_dist'
import * as path from "path";
import config from "./config";

export async function createApp() {
  const app = fastify({
    logger: { level: config.debug ? "info" : "warn", file: config.logFilePath },
  });
  app.register(cors);
  app.register(staticPlugin, {
    root: path.join(process.cwd(), "./static"),
    prefix: "/static/", // optional: default '/'
  });
  initAPI(app);
  // initFrontendDist(app)
  return app;
}

let store: { [key: string]: FastifyInstance } = {};

export async function getApp(id = "default") {
  if (!store[id]) {
    store[id] = await createApp();
  }
  return store[id];
}
