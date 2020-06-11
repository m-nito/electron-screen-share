import { desktopCapturer, ipcRenderer } from "electron";
import {
  EVT_CLOSING,
  EVT_SHOW_SELECTOR,
  EVT_SRC_SELECTED,
} from "./eventMessages";

/**
 * Shows video devices.
 * @param event
 * @param options
 */
export const getSources = (event, options) => {
  desktopCapturer.getSources(options).then(async (sources) => {
    let parent = document.querySelector(".capture-list");
    for (let source of sources) {
      let thumb = source.thumbnail.toDataURL();
      if (!thumb) continue;
      let title = source.name.slice(0, 30);

      let li = document.createElement("li");
      parent.appendChild(li);
      let a = document.createElement("a");
      let img = document.createElement("img");
      img.src = thumb;
      let span = document.createElement("span");
      let text = document.createTextNode(title);
      span.appendChild(text);
      li.appendChild(a);
      a.appendChild(img);
      a.appendChild(span);
      a.onclick = (e) => {
        e.preventDefault();
        ipcRenderer.send(EVT_SRC_SELECTED, source);
      };
    }
  });
  // resize parent
  let elem = <HTMLElement>document.querySelector(".card");
  elem.style.resize = "both";
};

function clearChildren() {
  let list = document.querySelector(".capture-list");
  for (let child of Array.from(list.childNodes)) {
    list.removeChild(child);
  }
}

ipcRenderer.on(EVT_SHOW_SELECTOR, getSources);
ipcRenderer.on(EVT_CLOSING, () => {
  ipcRenderer.send("closed");
});

ipcRenderer.send(EVT_SHOW_SELECTOR, { types: ["screen"] });
window.onload = function () {
  document.getElementById("mode-window-btn").addEventListener("click", () => {
    clearChildren();
    ipcRenderer.send(EVT_SHOW_SELECTOR, { types: ["window"] });
  });
  document.getElementById("mode-screen-btn").addEventListener("click", () => {
    clearChildren();
    ipcRenderer.send(EVT_SHOW_SELECTOR, { types: ["screen"] });
  });
};
