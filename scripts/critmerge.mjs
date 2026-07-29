#!/usr/bin/env node
import postcss from "postcss";
import discardDuplicates from "postcss-discard-duplicates";
import fs from "node:fs";
const FILE = "src/generated/critical.css";
const css = fs.readFileSync(FILE, "utf8");
const before = css.length;
const result = await postcss([discardDuplicates()]).process(css, { from: undefined });
fs.writeFileSync(FILE, result.css);
console.log(`${(before/1024).toFixed(1)}KB -> ${(result.css.length/1024).toFixed(1)}KB`);
