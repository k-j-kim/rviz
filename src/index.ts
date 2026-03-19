import * as path from "path";
import React from "react";
import { render } from "ink";
import { App } from "./app.js";
import { scanDir } from "./lib/fs.js";

// Use alternate screen buffer so the tree always starts at row 1,
// which lets mouse click coordinates map directly to tree rows.
process.stdout.write("\x1b[?1049h");
process.on("exit", () => process.stdout.write("\x1b[?1049l"));

const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const nodes = scanDir(targetPath);

render(React.createElement(App, { nodes, rootPath: targetPath }));
