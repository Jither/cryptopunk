"use strict";

const fs = require("fs-extra"),
    path = require("path"),
    os = require("os");

const srcFolder = path.resolve(__dirname) + path.sep;
const destFolder = path.resolve(os.homedir(), ".vscode/extensions/victor-vector-language");

const EXCLUDE = [".vscode", "install.js", "node_modules"];

fs.removeSync(destFolder);

fs.copySync(srcFolder, destFolder, {
    filter: (srcPath, destPath) => {
        let relative = path.relative(srcFolder, srcPath);
        relative = relative.replace(/\\/g, "/");
        return EXCLUDE.indexOf(relative) < 0;
    }
});
