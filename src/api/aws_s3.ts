// for a specified aws s3
import { FastifyPluginCallback } from "fastify";
import * as HTTPErrors from "http-errors";
import axios from "axios";
import { ConvertLog } from "../models";
import { getRepository } from "typeorm";
import { MD5 } from "crypto-js";
import * as fs from "fs";
import * as path from "path";
import * as hp from "helper-js";
import { spawnSync, exec, spawn } from "child_process";
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import * as GM from "gm";
import { downloadAndSave, genTmpPath } from "../services/download.service";
import { getFileExt, replaceFileExt, createMarkPromise } from "../utils";
import config from "../config";

const prefix = "/a";
const s3BaseUrl = "https://virtualtouch-3d-asset.s3.ap-east-1.amazonaws.com";
const s3_CDN_Base_Url = "https://d3j0knsfl28cuj.cloudfront.net";
const gm = GM.subClass({ imageMagick: true });

const routes: FastifyPluginCallback = function (app, opts, done) {
  app.get(prefix + "/:action/:options/*", async (req, reply) => {
    const action = req.params["action"] as string;
    const options = req.params["options"] as string;
    const originalPath = ("/" + req.params["*"]) as string;
    const fallback = () => {
      return reply.redirect(302, s3_CDN_Base_Url + originalPath);
    };
    if (action !== "resize") {
      req.log.warn("TODO");
      return fallback();
    }
    let m = options.match(/^(\d+)?x(\d+)?/);
    let w = m[1] && parseFloat(m[1]);
    let h = m[2] && parseFloat(m[2]);
    if (!w && !h) {
      throw new HTTPErrors["400"]("Invalid options");
    }
    // check log
    const fixedPrefix = "/aws_s3"; // Changes will affect existing data
    const id = MD5(
      fixedPrefix + req.url.slice(prefix.length).split("?")[0]
    ).toString();
    const repo = getRepository(ConvertLog);
    let item = await repo.findOne(id);
    if (!item) {
      item = new ConvertLog();
    }
    if (!item.success) {
      const filename = hp.arrayLast(originalPath.split("/"));
      const ext = getFileExt(filename);
      item.id = id;
      item.action = action;
      item.path = originalPath;
      item.type = ext;
      item.width_converted = w;
      item.height_converted = h;
      const failed = async (msg: string, error: any) => {
        item.success = false;
        item.error = `${msg}}`;
        await repo.save(item);
        if (downloaded) {
          // remove local file
          await fs.promises.unlink(localPath);
        }
        // throw error
        req.log.warn(msg);
        error && req.log.warn(error);
      };
      // download img
      let downloaded;
      const fullRemoteUrl = s3BaseUrl + originalPath;
      const localPath = genTmpPath(filename);
      try {
        await hp.retry(() => downloadAndSave(fullRemoteUrl, localPath), 5);
        downloaded = true;
      } catch (error) {
        await failed("Failed to download", error);
        return fallback();
      }
      // process
      // read info
      const waitInfo = createMarkPromise<GM.ImageInfo, Error>();
      gm(localPath).identify((err, value) => {
        err ? waitInfo.reject(err) : waitInfo.resolve(value);
      });
      try {
        const info = await waitInfo.promise;
        if (w && !h) {
          h = w / (info.size.width / info.size.height);
        } else if (!w && h) {
          w = h * (info.size.width / info.size.height);
        }
        item.width_converted = w;
        item.height_converted = h;
        item.type = info.format;
        item.width = info.size.width;
        item.height = info.size.height;
        item.size = parseInt(
          info.Filesize.substring(0, info.Filesize.length - 1)
        );
      } catch (error) {
        await failed("Failed to read image info", error);
        return fallback();
      }
      // resize
      const waitResize = createMarkPromise<void, Error>();
      gm(localPath)
        .resize(w, h, "!")
        .write(localPath, function (err) {
          err ? waitResize.reject(err) : waitResize.resolve();
        });
      let mimeType: string;
      try {
        await waitResize.promise;
        // read converted info
        const waitInfo = createMarkPromise<GM.ImageInfo, Error>();
        gm(localPath).identify((err, value) => {
          err ? waitInfo.reject(err) : waitInfo.resolve(value);
        });
        try {
          const info = await waitInfo.promise;
          item.type_converted = info.format;
          item.size_converted = parseInt(
            info.Filesize.substring(0, info.Filesize.length - 1)
          );
          mimeType = info["Mime type"];
        } catch (error) {
          await failed("Failed to read converted image info", error);
          return fallback();
        }
      } catch (error) {
        await failed("Failed to resize image", error);
        return fallback();
      }
      // upload to s3
      const newPath = replaceFileExt(
        "/converted" + originalPath,
        item.type_converted.toLowerCase()
      );
      item.result = newPath;
      const client = new S3Client({
        region: config.aws.defaultRegion,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      });
      const cmd = new PutObjectCommand({
        Bucket: config.aws.defaultBucket,
        Key: newPath.replace(/^\//, ""), // remove '/' at left start
        ContentType: mimeType,
        Body: fs.createReadStream(localPath),
        ACL: "public-read",
      });
      try {
        await client.send(cmd);
      } catch (error) {
        await failed("Failed to upload image to s3", error);
        return fallback();
      } finally {
        client.destroy();
      }
      // remove local file
      await fs.promises.unlink(localPath);
      // save log
      item.success = true;
      await repo.save(item);
    }
    return reply.redirect(302, s3_CDN_Base_Url + item.result);
  });
  //
  done();
};

export default routes;
