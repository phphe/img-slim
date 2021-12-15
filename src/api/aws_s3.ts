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

const prefix = config.services.aws_s3.urlPrefix;
const s3BaseUrl = "https://virtualtouch-3d-asset.s3.ap-east-1.amazonaws.com";
const s3_CDN_Base_Url = "https://d3j0knsfl28cuj.cloudfront.net";
const gm = GM.subClass({ imageMagick: true });

const routes: FastifyPluginCallback = function (app, opts, done) {
  app.get(prefix + "/:options/*", async (req, reply) => {
    const fixedPrefix = config.services.aws_s3.idName; // Changes will affect existing data
    const id = MD5(
      fixedPrefix + req.url.slice(prefix.length).split("?")[0]
    ).toString();
    const repo = getRepository(ConvertLog);
    let item = await repo.findOne(id);
    if (item && item.success) {
      // 开始时应当还有优化空间. 考虑redis等缓存
      return redirectToResult();
    }
    if (!item) {
      item = new ConvertLog();
    }
    const options = req.params["options"] as string;
    const originalPath = getOriginalPath(); // originalPath is '*' and query
    let t2 = originalPath.split("?");
    const originalPathWithoutQuery = t2[0];
    const originalPathQuery = t2[1] ? "?" + t2[1] : "";
    const fallback = () => {
      return reply.redirect(302, s3_CDN_Base_Url + originalPath);
    };
    // resolve options
    let w: number, h: number, wMax: number, hMax: number, quality: number;
    let t = options.split("-");
    let sizeFound = false;
    let maxSizeFound = false;
    let qualityFound = false;
    for (const t2 of t) {
      if (!sizeFound) {
        let m = t2.match(/^(\d+)?x(\d+)?$/);
        if (m) {
          w = m[1] && parseFloat(m[1]);
          h = m[2] && parseFloat(m[2]);
          sizeFound = true;
          continue;
        }
      }
      if (!maxSizeFound) {
        let m = t2.match(/^max(\d+)?x(\d+)?$/);
        if (m) {
          wMax = m[1] && parseFloat(m[1]);
          hMax = m[2] && parseFloat(m[2]);
          maxSizeFound = true;
          continue;
        }
      }
      if (!qualityFound) {
        let m = t2.match(/^q(\d{1,3})$/);
        if (m) {
          quality = parseInt(m[1]);
          qualityFound = true;
          continue;
        }
      }
    }
    if (!w && !h && !wMax && !hMax && !qualityFound) {
      throw new HTTPErrors["400"]("No valid option");
    }
    // check log
    if (!item.success) {
      const filename = hp.arrayLast(originalPathWithoutQuery.split("/"));
      const ext = getFileExt(filename);
      item.id = id;
      item.path = originalPath;
      item.type = ext;
      item.width_converted = w;
      item.height_converted = h;
      item.quality_converted = quality?.toString();
      const failed = async (msg: string, error: any) => {
        item.success = false;
        item.error = msg;
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
      const fullRemoteUrl = s3BaseUrl + originalPathWithoutQuery; // without query. only for current service
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
        item.type = info.format;
        item.width = info.size.width;
        item.height = info.size.height;
        item.quality = info["Quality"] || info["JPEG-Quality"];
        if (wMax && !hMax) {
          if (item.width > wMax) {
            w = wMax;
            h = wMax / (item.width / item.height);
          }
        } else if (!wMax && hMax) {
          if (item.height > hMax) {
            h = hMax;
            w = hMax * (item.width / item.height);
          }
        } else if (wMax && hMax) {
          if (item.width > wMax) {
            w = wMax;
          }
          if (item.height > hMax) {
            h = hMax;
          }
        }
        item.size = (await fs.promises.stat(localPath)).size;
      } catch (error) {
        await failed("Failed to read image info", error);
        return fallback();
      }
      // process img
      const waitProcess = createMarkPromise<void, Error>();
      let gmChain = gm(localPath);
      if (w || h) {
        gmChain = gmChain.resize(w, h, "!");
      }
      if (quality) {
        gmChain = gmChain.quality(quality);
      }
      gmChain.write(localPath, function (err) {
        err ? waitProcess.reject(err) : waitProcess.resolve();
      });
      let mimeType: string;
      try {
        await waitProcess.promise;
        // read converted info
        const waitInfo = createMarkPromise<GM.ImageInfo, Error>();
        gm(localPath).identify((err, value) => {
          err ? waitInfo.reject(err) : waitInfo.resolve(value);
        });
        try {
          const info = await waitInfo.promise;
          item.type_converted = info.format;
          item.width_converted = info.size.width;
          item.height_converted = info.size.height;
          item.quality_converted = info["Quality"] || info["JPEG-Quality"];
          item.size_converted = (await fs.promises.stat(localPath)).size;
          mimeType = info["Mime type"];
        } catch (error) {
          await failed("Failed to read converted image info", error);
          return fallback();
        }
      } catch (error) {
        await failed("Failed to process image", error);
        return fallback();
      }
      // upload to s3
      const newPath =
        replaceFileExt(
          "/converted" + originalPathWithoutQuery,
          item.type_converted.toLowerCase()
        ) + originalPathQuery;
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
        Key: newPath.replace(/^\//, "").split("?")[0], // remove '/' at left start; remove query
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
      return redirectToResult();
    }
    // functions
    function getOriginalPath() {
      let r = req.params["*"] as string;
      r = req.url.substring(req.url.indexOf(r));
      r = "/" + r;
      return r;
    }
    function redirectToResult() {
      return reply.redirect(302, s3_CDN_Base_Url + item.result);
    }
  });
  //
  done();
};

export default routes;
