import * as Fs from 'fs'
import * as path from 'path'
import * as os from "os";
import Axios from 'axios'
// import { HttpsProxyAgent } from 'https-proxy-agent'
import { spawnSync } from 'child_process'
import * as hp from 'helper-js'

export async function downloadAndSave(url: string, path: string) {
  // axios image download with response type "stream"
  const response = await Axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  })

  // pipe the result stream into a file on disc
  response.data.pipe(Fs.createWriteStream(path))

  // return a promise and resolve when download finishes
  return new Promise((resolve, reject) => {
    response.data.on('end', () => {
      resolve(null)
    })

    response.data.on('error', (error) => {
      reject(error)
    })
  })
}
// download by proxy
// const httpsAgent = new HttpsProxyAgent({
//   host: '127.0.0.1',
//   port: '7890',
// })
// const http = Axios.create({ httpsAgent })
// export async function downloadAndSave(url: string, path: string) {
//   // axios image download with response type "stream"
//   const response = await http({
//     method: 'GET',
//     url: url,
//     responseType: 'stream',
//   })

//   // pipe the result stream into a file on disc
//   response.data.pipe(Fs.createWriteStream(path))

//   // return a promise and resolve when download finishes
//   return new Promise((resolve, reject) => {
//     response.data.on('end', () => {
//       resolve(null)
//     })

//     response.data.on('error', () => {
//       reject()
//     })
//   })
// }

export function wgetDownloadAndSave(url: string, path: string) {
  const wgetPath = 'C:/Green Apps/wget-1.21.1-1-win64/wget.exe'
  return spawnSync(wgetPath, ['-O', path, url])
}

export function genTmpName(filename:string, length=16) {
  const ext = hp.arrayLast(filename.split('.'))
  return hp.randString(length) + '.' + ext
}

export function genTmpPath(filename:string, length=16) {
  return path.join(os.tmpdir(), genTmpName(filename, length))
}