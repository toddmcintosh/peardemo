// import path from "bare-path";

export function createWorker({
  ipc,
  Autopass,
  Corestore,
  fs,
  path,
  rawBase,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  if (!ipc) {
    throw new Error("Worker was not started by pear-run");
  }

  const baseDir = path.dirname(rawBase);
  const storePath = path.join(baseDir, "./pass");

  let store, pass;
  let buffer = "";

  const returnMsgList = async () => {
    const list = [];
    for await (const item of pass.list()) {
      list.push({
        key: item.key,
        value: item.value,
      });
    }

    list.sort((a, b) => {
      const valA = JSON.parse(a.value);
      const valB = JSON.parse(b.value);
      if (!valA?.timestamp) return 1;
      if (!valB?.timestamp) return -1;
      return valB.timestamp - valA.timestamp;
    });

    ipc.write(JSON.stringify({ type: "msgList", list }) + "\n");
  };

  const newInstance = async () => {
    await fs.mkdir(storePath, { recursive: true });
    store = new Corestore(storePath);
    pass = new Autopass(store);
    await pass.ready();

    const inv = await pass.createInvite();
    ipc.write(JSON.stringify({ type: "invite", invite: inv }) + "\n");
    ipc.write(JSON.stringify({ type: "ready" }) + "\n");
    await returnMsgList();
  };

  const onData = async (buf) => {
    buffer += buf.toString();

    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;

      const msg = JSON.parse(line);
      let id, strPayload;

      switch (msg.type) {
        case "new-instance":
          await newInstance();
          break;

        case "add":
          id = msg.id.toString();
          strPayload = JSON.stringify(msg.payload);
          await pass.add(id, strPayload);
          await returnMsgList();
          ipc.write(JSON.stringify({ type: "added", id }) + "\n");
          break;

        case "update":
          id = msg.id.toString();
          strPayload = JSON.stringify(msg.payload);
          await pass.remove(id);
          await pass.add(id, strPayload);
          await returnMsgList();
          ipc.write(JSON.stringify({ type: "updated", id }) + "\n");
          break;

        case "delete":
          id = msg.id.toString();
          await pass.remove(id);
          await returnMsgList();
          break;

        case "delete-all":
          for await (const item of pass.list()) {
            await pass.remove(item.key);
          }
          await returnMsgList();
          break;

        case "pair": {
          const storePath2 = path.join(baseDir, "./another-pass");
          await fs.mkdir(storePath2, { recursive: true });

          const pair = Autopass.pair(
            new Corestore(storePath2),
            msg.pairingCode,
          );

          setTimeoutFn(() => {
            ipc.write(
              JSON.stringify({ type: "paired", success: false }) + "\n",
            );
          }, 10000);

          const anotherPass = await pair.finished();
          await anotherPass.ready();
          ipc.write(JSON.stringify({ type: "ready" }) + "\n");
          ipc.write(JSON.stringify({ type: "paired", success: true }) + "\n");
          break;
        }
      }
    }
  };

  ipc.on("data", onData);

  ipc.on("error", (err) => {
    if (err?.code === "ECONNRESET") return;
    console.error("ipc error:", err);
  });

  return {
    onData,
    newInstance,
  };
}
