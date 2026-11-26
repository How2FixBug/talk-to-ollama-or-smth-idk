import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("HTML shell references existing app assets and unique IDs", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const asset of ["./styles.css", "./js/app.js"]) {
    const path = new URL("../" + asset.replace("./", ""), import.meta.url);
    await readFile(path, "utf8");
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "HTML IDs must be unique");
  assert.match(html, /type="module" src="\.\/js\/app\.js"/);
});
