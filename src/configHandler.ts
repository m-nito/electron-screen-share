import fs = require("fs");

const CONF_PATH = "./conf.json";
const ENCODING = "utf8";

/**
 * Creates empty conf.json if none exists.
 */
function tryScaffolding(): void {
  if (!fs.existsSync(CONF_PATH)) {
    try {
      fs.writeFileSync(
        CONF_PATH,
        JSON.stringify({
          apiKey: "",
          authDomain: "",
          databaseURL: "",
          projectId: "",
          storageBucket: "",
          messagingSenderId: "",
          appId: "",
          measurementId: "",
        }),
        ENCODING
      );
    } catch (err) {
      console.error(err);
    }
  }
}

/**
 * Gets api config.
 */
function getApi(): any {
  let file = fs.readFileSync(CONF_PATH, ENCODING);
  try {
    return JSON.parse(file);
  } catch (err) {
    console.error(err);
    return null;
  }
}

/**
 *Loads json.
 */
export default function loadJson(): any {
  tryScaffolding();
  return getApi();
}
