import { rejects } from "assert";
import * as hp from "helper-js";
import { resolve } from "path/posix";

export function getFileExt(filename: string) {
  return hp.arrayLast(filename.split("."));
}

export function replaceFileExt(filename: string, newExt: string) {
  let t = filename.split(".");
  t = t.slice(0, t.length - 1);
  t.push(newExt);
  return t.join(".");
}

export function createMarkPromise<T, E>() {
  let resolve: (arg: T) => void, reject: (error: E) => void;
  const promise = new Promise<T>((resolve2, reject2) => {
    resolve = resolve2;
    reject = reject2;
  });
  return { promise, resolve, reject };
}
