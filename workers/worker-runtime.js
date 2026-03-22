import pipe from "pear-pipe";
import Autopass from "autopass";
import Corestore from "corestore";
import path from "bare-path";
import fs from "bare-fs";
import { createWorker } from "./worker.js";

const ipc = pipe();

createWorker({
  ipc,
  Autopass,
  Corestore,
  fs,
  path,
  rawBase: Bare.argv[0],
});
