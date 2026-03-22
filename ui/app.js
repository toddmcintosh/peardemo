/** @typedef {import('pear-interface')} */ /* global Pear */
import ui from "pear-electron";
import updates from "pear-updates";
import run from "pear-run";
import {
  createIcons,
  ArrowUp,
  ArrowDown,
  Trash2,
  TriangleAlert,
  BadgeCheck,
} from "lucide";

//ui refresher for development, remove in production
import "./dev/refresh.js";

const workerLink =
  Pear.app.key === null
    ? "./workers/worker-runtime.js"
    : `${Pear.app.link.replace(/\/$/, "")}/workers/worker-runtime.js`;
const workerDataPath = `${Pear.app.storage}/pass`;
const pipe = run(workerLink, [workerDataPath]);

const decoder = new TextDecoder();
let buffer = "";
let localMsgList;
let selectedMsg;
let activeMsgId;
let activeColor = "";
let statusIsPairing;
let dots = "";
let instanceRequested = false;

//ui elements-------------------------------------------------
const butAdd = document.getElementById("add");
const msgText = document.getElementById("msgText");
const messages = document.getElementById("messages");
const pairText = document.getElementById("pairText");
const butPair = document.getElementById("pair");
const pairStatus = document.getElementById("pairStatus");
const inviteCode = document.getElementById("inviteCode");
const butCopyInviteCode = document.getElementById("copyInviteCode");
const butNewInstance = document.getElementById("newInstance");
const startPanel = document.getElementById("startPanel");
const mainPanel = document.getElementById("mainPanel");
const statusTxt = document.getElementById("statusTxt");
const butRed = document.getElementById("red");
const butYellow = document.getElementById("yellow");
const butGreen = document.getElementById("green");
// const butDeleteAll = document.getElementById("deleteAll");
const invitePanel = document.getElementById("invitePanel");
const spinnerWrap = document.getElementById("spinnerWrap");
const butTestError = document.getElementById("testError");
const butResetStatus = document.getElementById("resetStatus");

//ui triggers-------------------------------------------------
butRed.onclick = async () => {
  await updateColorButtons("red");
};

butYellow.onclick = async () => {
  await updateColorButtons("yellow");
};

butGreen.onclick = async () => {
  await updateColorButtons("green");
};

butNewInstance.onclick = async () => {
  if (!instanceRequested) {
    spinnerWrap.classList.remove("hidden");
    pipe.write(JSON.stringify({ type: "new-instance" }) + "\n");
    instanceRequested = true;
  }
};

butPair.onclick = async () => {
  dots = "";
  statusIsPairing = setInterval(incrementPairingStatus, 500);
  const pairingCode = pairText.value;
  pipe.write(JSON.stringify({ type: "pair", pairingCode }) + "\n");
};

// butDeleteAll.onclick = async () => {
//   pipe.write(JSON.stringify({ type: "delete-all" }) + "\n");
// };

butCopyInviteCode.onclick = async () => {
  copyToClipboard(inviteCode.innerText);
  butCopyInviteCode.classList.remove("text-gray-400");
  butCopyInviteCode.classList.add("text-green-600");
  butCopyInviteCode.innerText = "COPIED!";
  setTimeout(() => {
    butCopyInviteCode.classList.remove("text-green-600");
    butCopyInviteCode.classList.add("text-gray-400");
    butCopyInviteCode.innerText = "COPY";
  }, 2000);
};

butAdd.onclick = async () => {
  const id = globalThis.crypto.randomUUID();
  const payload = { msg: "New note", timestamp: Date.now(), color: "" };
  pipe.write(JSON.stringify({ type: "add", id, payload }) + "\n");
};

butTestError.onclick = async () => {
  statusTxt.innerHTML = genErrorMsg("This is a test error");
  statusTxt.classList.remove("text-gray-500");
  statusTxt.classList.add("text-red-500");
  butTestError.classList.add("hidden");
  butResetStatus.classList.remove("hidden");
  updateIcons();
};

butResetStatus.onclick = async () => {
  statusTxt.innerHTML = genGoodStatusMsg("good");
  statusTxt.classList.remove("text-red-500");
  statusTxt.classList.add("text-gray-500");
  butTestError.classList.remove("hidden");
  butResetStatus.classList.add("hidden");
  updateIcons();
};

//util functions---------------------------------------------------
const setMsgActive = (id) => {
  if (!localMsgList) {
    return;
  }
  selectedMsg = localMsgList.find((m) => m.key.toString() === id) ?? null;
  if (!selectedMsg) {
    return console.error("Message with id not found in local list:", id);
  }
  activeMsgId = id;
  //reset all buttons to default state
  const msgList = document.getElementById("messages");
  msgList
    // .closest("#messages")
    .querySelectorAll(".item")
    .forEach((item) => {
      item.classList.remove("bg-gray-800");
      item.classList.add("bg-gray-700");
    });
  //target button to active state
  const el = msgList.querySelector(`.item[data-id="${id}"]`);
  if (!el) {
    return;
  }
  el.classList.remove("bg-gray-700");
  el.classList.add("bg-gray-800");
  const val = JSON.parse(selectedMsg.value);
  msgText.value = val.msg; // "Clicked id: " + id;
  unsetColorButtons(val.color || "");
  setColorButtons(val.color || "");
};

const updateActiveMsgColor = (col) => {
  const val = selectedMsg ? JSON.parse(selectedMsg.value) : null;
  if (!val) {
    return console.error("No message selected to update color for");
  }
  const updatedPayload = {
    msg: val.msg,
    timestamp: val.timestamp || Date.now(),
    color: col,
  };

  const id = activeMsgId;
  pipe.write(
    JSON.stringify({ type: "update", id, payload: updatedPayload }) + "\n",
  );
};

const updateIcons = () => {
  createIcons({
    icons: {
      ArrowUp,
      ArrowDown,
      Trash2,
      TriangleAlert,
      BadgeCheck,
    },
    attrs: {
      width: "100%",
      height: "100%",
      class: "w-full h-full",
    },
  });
};

const incrementPairingStatus = () => {
  dots = dots.length > 6 ? "" : dots + ".";
  let status = dots;
  pairStatus.innerText = status;
};

const unsetColorButtons = async (col) => {
  butRed.classList.remove("bg-red-500");
  butRed.classList.add("bg-red-900");
  butYellow.classList.remove("bg-yellow-500");
  butYellow.classList.add("bg-yellow-900");
  butGreen.classList.remove("bg-green-500");
  butGreen.classList.add("bg-green-900");
};

const setColorButtons = async (col) => {
  switch (col) {
    case "red":
      butRed.classList.remove("bg-red-900");
      butRed.classList.add("bg-red-500");
      break;
    case "yellow":
      butYellow.classList.remove("bg-yellow-900");
      butYellow.classList.add("bg-yellow-500");
      break;
    case "green":
      butGreen.classList.remove("bg-green-900");
      butGreen.classList.add("bg-green-500");
      break;
  }
};

const updateColorButtons = async (col) => {
  unsetColorButtons(col);
  if (activeColor === col) {
    //deactivate if same color is clicked
    activeColor = "";
    updateActiveMsgColor("");
    return;
  }
  activeColor = col;
  updateActiveMsgColor(col);
  setColorButtons(col);
};

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}
const genMsgListItem = (id, text, barColor, timestamp) => {
  return `
    <div data-id="${id}" class="item group relative flex flex-row w-full border-b-1 border-gray-800/30 bg-gray-700/70 p-0 pr-2 pl-0 items-end" >
      <div class="absolute w-full h-full left-0 top-0 z-1 opacity-0 bg-blue-500 group-hover:opacity-10 hover:cursor-pointer"></div>
      <div class="w-[6px] shrink-0 p-0 m-0 mr-3 h-full ${barColor}" ></div>
      <div class="flex flex-col flex-1 min-w-0">
        <div class="text-[12px] text-blue-500 p-0 m-0">
          ${text}
        </div>
        <div class="text-[9px] p-0 text-gray-500 m-0">
          ${timestamp}
        </div>
      </div>
      <button data-id="${id}" class="trash absolute right-1 bottom-1 z-10 w-[15px] h-[15px] rounded bg-gray-700 opacity-10 group-hover:opacity-100" >
        <i data-lucide="trash-2" class="w-full h-full" ></i>
      </button>
      <div data-id="${id}" class="trash-confirm absolute flex flex-row left-0 top-0 z-20 w-full h-full p-0 m-0 hidden">
        <button data-id="${id}" class="trash-delete w-full h-full text-white text-[10px] p-0 px-2 bg-orange-500 hover:bg-orange-700 leading-tight" >
          Confirm Delete?
        </button>
        <button data-id="${id}" class="trash-cancel w-full h-full text-white text-[10px] p-0 px-2 bg-gray-500 hover:bg-gray-700 leading-tight" >
          Cancel
        </button>
      </div>
    </div>
    `;
};

const genErrorMsg = (msg) => {
  return `
    <div class="w-[20px] h-[20px] mr-2"><i data-lucide="triangle-alert" ></i></div>
    <div>Error: ${msg}</div>`;
};

const genGoodStatusMsg = (msg) => {
  return `
    <div class="w-[20px] h-[20px] mr-2"><i data-lucide="badge-check" ></i></div>
    <div>Error: ${msg}</div>`;
};

const genMsgList = (msg) => {
  messages.innerHTML = "";
  for (const m of msg.list) {
    const id = m.key.toString();
    if (m.value === "undefined" || m.value === null) {
      continue;
    }
    const payload = JSON.parse(m.value);
    const timestamp = new Date(payload.timestamp).toLocaleString();
    let barColor = "bg-gray-700";
    if (payload.color !== undefined && payload.color !== "") {
      barColor = "bg-" + payload.color + "-500";
    }
    const strLength = payload.msg.length < 20 ? payload.msg.length : 20;
    let text = payload.msg.substring(0, strLength);

    messages.innerHTML += genMsgListItem(id, text, barColor, timestamp);
  }
  localMsgList = msg.list;
  setMsgActive(localMsgList[0]?.key.toString());
};

//event listeners---------------------------------------------------
document.getElementById("messages").addEventListener("click", (e) => {
  const el = e.target.closest(".item");
  if (!el) return;
  const id = el.dataset.id;
  setMsgActive(id);
});

document.getElementById("messages").addEventListener("click", (e) => {
  const trashBtn = e.target.closest(".trash");
  if (trashBtn) {
    const row = trashBtn.closest(".item");
    const confirm = row.querySelector(".trash-confirm");
    if (!confirm) return;
    confirm.classList.remove("hidden");
  }
  const trashDeleteBtn = e.target.closest(".trash-delete");
  if (trashDeleteBtn && !trashDeleteBtn.classList.contains("hidden")) {
    //do final delete action
    const id = trashDeleteBtn.dataset.id;
    const currentIndex = localMsgList.findIndex((m) => m.key.toString() === id);
    const nextCandidate = localMsgList[currentIndex + 1];
    const prevCandidate = localMsgList[currentIndex - 1];
    const newActiveId =
      nextCandidate.key.toString() || prevCandidate?.key.toString();
    if (newActiveId) {
      setMsgActive(newActiveId);
    }
    pipe.write(JSON.stringify({ type: "delete", id }) + "\n");
  }
  const trashCancelBtn = e.target.closest(".trash-cancel");
  if (trashCancelBtn && !trashCancelBtn.classList.contains("hidden")) {
    const row = trashCancelBtn.closest(".item");
    const confirm = row.querySelector(".trash-confirm");
    if (!confirm) return;
    confirm.classList.add("hidden");
  }
});

const ta = document.getElementById("msgText");
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
//we're saving the msg text automatically, so debounce required
const handleInput = debounce((value) => {
  const payload = { msg: value, timestamp: Date.now() };
  const id = selectedMsg ? selectedMsg.key.toString() : crypto.randomUUID();
  pipe.write(JSON.stringify({ type: "add", id, payload }) + "\n");
}, 300);

ta.addEventListener("input", (e) => {
  handleInput(e.target.value);
});

//pipe event handlers---------------------------------------------------
pipe.on("error", (err) => {
  if (err?.code === "ECONNRESET") return; // ignore shutdown
  console.error("pipe error:", err);
});

//data response handler from worker, updates the UI based on message type
pipe.on("data", (chunk) => {
  buffer += decoder.decode(chunk, { stream: true });
  let idx;

  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;

    try {
      const msg = JSON.parse(line);
      switch (msg.type) {
        case "msgList":
          genMsgList(msg);
          break;
        case "paired":
          pairStatus.innerText = msg.success ? "paired" : "unpaired";
          clearInterval(statusIsPairing);
          pairText.value = "";
          break;
        case "invite":
          inviteCode.innerText = msg.invite;
          invitePanel.classList.remove("hidden");
          break;
        case "ready":
          mainPanel.classList.remove("hidden");
          startPanel.classList.add("hidden");
          break;
        case "added":
          setMsgActive(msg.id);
          break;
        case "updated":
          setMsgActive(msg.id);
          break;
      }
    } catch (err) {
      statusTxt.innerHTML = genErrorMsg(err.message);
      statusTxt.classList.remove("text-gray-500");
      statusTxt.classList.add("text-red-500");
      console.error("bad json:", line, err);
    }
    updateIcons();
  }
});

//updates is for limited access from root application (restart, update)
Pear.updates(async (update) => {
  console.log("pear updates hit", update);
});

//initital state----------------------------------------
startPanel.classList.remove("hidden");
mainPanel.classList.add("hidden");
updateIcons();

// for dev - temp load instance on start
// startPanel.classList.remove("hidden");
// mainPanel.classList.remove("hidden");
// if (!instanceRequested) {
//   pipe.write(JSON.stringify({ type: "new-instance" }) + "\n");
//   instanceRequested = true;
// }
