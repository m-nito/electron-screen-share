import { desktopCapturer, ipcRenderer } from "electron";

export const getSources = (event, options) => {
  desktopCapturer.getSources(options).then(async (sources) => {
    let sourcesList = document.querySelector(".capture-list");
    for (let source of sources) {
      let thumb = source.thumbnail.toDataURL();
      if (!thumb) continue;
      let title = source.name.slice(0, 30);

      let li = document.createElement("li");
      sourcesList.appendChild(li);
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
        ipcRenderer.send("sourceSelected", source);
      };
    }
  });
  // resize parent
  let elem = <HTMLElement>document.querySelector(".card");
  elem.style.resize = "both";
};

ipcRenderer.on("showSourceSelector", getSources);
ipcRenderer.on("closing", () => {
  ipcRenderer.send("closed");
});
ipcRenderer.send("showSourceSelector", { types: ["screen", "window"] });
