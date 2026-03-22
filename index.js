/** @typedef {import('pear-interface')} */ /** global Pear */
import Runtime from "pear-electron";
import Bridge from "pear-bridge";

const bridge = new Bridge({
  mount: "/ui",
  waypoint: "index.html",
});

await bridge.ready();
const runtime = new Runtime();
export const pipe = await runtime.start({ bridge });

pipe.on("close", () => Pear.exit());

pipe.on("data", async (data) => {
  const cmd = Buffer.from(data).toString();
  if (cmd === "hello from ui") {
    pipe.write("sweet bidirectionality");
  }
  if (cmd === "restart") {
    Pear.restart();
  }
  if (cmd === "exit") {
    Pear.exit();
  }
});

pipe.on("error", (err) => {
  if (err?.code === "ECONNRESET") return; // ignore shutdown
  console.error("pipe error:", err);
});

pipe.write("hello from app");
