import test from "brittle";
import path from "node:path";
import { createWorker } from "../workers/worker.js";

function makeFakeIpc() {
  const handlers = new Map();
  const writes = [];

  return {
    writes,
    on(event, fn) {
      handlers.set(event, fn);
    },
    write(data) {
      writes.push(data);
    },
    async emit(event, data) {
      const fn = handlers.get(event);
      if (fn) await fn(data);
    },
  };
}

function makeFakePass(initial = []) {
  const items = new Map(initial);

  return {
    async ready() {},
    async createInvite() {
      return "INVITE123";
    },
    async add(key, value) {
      items.set(key, value);
    },
    async remove(key) {
      items.delete(key);
    },
    async *list() {
      for (const [key, value] of items) {
        yield { key, value };
      }
    },
  };
}

test("new-instance emits invite, ready, and empty msgList", async (t) => {
  const ipc = makeFakeIpc();
  const pass = makeFakePass();

  class FakeCorestore {
    constructor(storePath) {
      this.storePath = storePath;
    }
  }

  function FakeAutopass() {
    return pass;
  }
  FakeAutopass.pair = () => {
    throw new Error("not used");
  };

  const fs = {
    async mkdir() {},
  };

  createWorker({
    ipc,
    Autopass: FakeAutopass,
    Corestore: FakeCorestore,
    fs,
    path,
    rawBase: "/tmp/app/current",
  });

  await ipc.emit("data", Buffer.from('{"type":"new-instance"}\n'));

  t.alike(JSON.parse(ipc.writes[0]), { type: "invite", invite: "INVITE123" });
  t.alike(JSON.parse(ipc.writes[1]), { type: "ready" });
  t.alike(JSON.parse(ipc.writes[2]), { type: "msgList", list: [] });
});

test("add emits sorted msgList and added", async (t) => {
  const ipc = makeFakeIpc();
  const pass = makeFakePass([
    ["old", JSON.stringify({ msg: "old", timestamp: 100 })],
  ]);

  class FakeCorestore {
    constructor(storePath) {
      this.storePath = storePath;
    }
  }

  function FakeAutopass() {
    return pass;
  }
  FakeAutopass.pair = () => {
    throw new Error("not used");
  };

  const fs = {
    async mkdir() {},
  };

  createWorker({
    ipc,
    Autopass: FakeAutopass,
    Corestore: FakeCorestore,
    fs,
    path,
    rawBase: "/tmp/app/current",
  });

  await ipc.emit("data", Buffer.from('{"type":"new-instance"}\n'));
  ipc.writes.length = 0;

  await ipc.emit(
    "data",
    Buffer.from(
      JSON.stringify({
        type: "add",
        id: "new",
        payload: { msg: "new", timestamp: 200 },
      }) + "\n",
    ),
  );

  const msgList = JSON.parse(ipc.writes[0]);
  const added = JSON.parse(ipc.writes[1]);

  t.is(msgList.type, "msgList");
  t.is(msgList.list[0].key, "new");
  t.is(msgList.list[1].key, "old");
  t.alike(added, { type: "added", id: "new" });
});

test("handles split buffered input", async (t) => {
  const ipc = makeFakeIpc();
  const pass = makeFakePass();

  class FakeCorestore {
    constructor(storePath) {
      this.storePath = storePath;
    }
  }

  function FakeAutopass() {
    return pass;
  }
  FakeAutopass.pair = () => {
    throw new Error("not used");
  };

  const fs = {
    async mkdir() {},
  };

  createWorker({
    ipc,
    Autopass: FakeAutopass,
    Corestore: FakeCorestore,
    fs,
    path,
    rawBase: "/tmp/app/current",
  });

  await ipc.emit("data", Buffer.from('{"type":"new-instance"}\n'));
  ipc.writes.length = 0;

  await ipc.emit(
    "data",
    Buffer.from('{"type":"add","id":"abc","payload":{"msg":"he'),
  );
  t.is(ipc.writes.length, 0);

  await ipc.emit("data", Buffer.from('llo","timestamp":123}}\n'));

  t.is(JSON.parse(ipc.writes[1]).type, "added");
  t.is(JSON.parse(ipc.writes[1]).id, "abc");
});
