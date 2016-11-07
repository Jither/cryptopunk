#!/usr/bin/env node
"use strict";

const
	commander = require("commander"),
	fs = require("fs"),
	path = require("path"),
	readline = require("readline"),
	Reporter = require("./reporter"),

	VictorExecuter = require("./executer");

function parseLine(line, index, fileName)
{
	line = line.trim();
	if (line === "")
	{
		return VictorExecuter.EMPTY_LINE;
	}
	if (line.charAt(0) === "#")
	{
		// Ignore comments
		return null;
	}

	const separatorIndex = line.indexOf(":");
	if (!separatorIndex)
	{
		throw new Error(`Separator ':' expected at line ${index} in ${fileName}`);
	}
	const prefix = line.substring(0, separatorIndex).trim();
	const value = line.substring(separatorIndex + 1).trim();
	return { prefix, value };
}

function parseData(lines, executer)
{
	let lineIndex = 0;
	lines.forEach(line => {
		lineIndex++;
		const parsed = parseLine(line, lineIndex, executer.fileName);
		if (!parsed)
		{
			return;
		}
		executer.handleLine(parsed);
	});
	// In case there's no empty line at the end:
	executer.handleLine(VictorExecuter.EMPTY_LINE);
}

function testFile(filePath, reporter, transformClasses)
{
	const fileName = path.basename(filePath, ".vectors");
	const executer = new VictorExecuter(fileName, reporter, transformClasses);
	return new Promise((resolve, reject) => {
		// Yeah, we're loading the entire file before processing, because
		// otherwise we'd have to wait for the file to close to get the
		// last line that causes the last test to run.
		fs.readFile(filePath, "utf-8", (err, data) => {
			if (err)
			{
				return reject(err);
			}
			const lines = data.split(/\r?\n/);
			parseData(lines, executer);
			return resolve();
		});
	});
}

function testFolder(folder, reporter, transformClasses)
{
	return new Promise((resolve, reject) => {
		fs.readdir(folder, (err, files) => {
			if (err)
			{
				return reject(err);
			}
			const filePromises = [];
			files.forEach(file => {
				if (path.extname(file).toLowerCase() === ".vectors")
				{
					const filePath = path.join(folder, file);
					filePromises.push(testFile(filePath, reporter, transformClasses));
				}
			});
			Promise.all(filePromises).then(() => {
				resolve();
			});
		});
	});
}

function loadTransforms(transformsPath)
{
	if (!transformsPath)
	{
		throw new Error("No path to transforms specified.");
	}
	const relTransformsPath = path.relative(__dirname, transformsPath);
	// In the future, we'll use module exports - for now, we use a global object, "TRANSFORMS":
	return require(relTransformsPath).default || global.TRANSFORMS;
}

commander
	.arguments("<folder>")
	.option("-t, --transforms <path>", "Javascript exposing transforms")
	.option("-v, --verbose", "Verbose output")
	.action((folder, options) => {
		const transformClasses = loadTransforms(options.transforms);
		const reporter = new Reporter(options.verbose);
		testFolder(folder, reporter, transformClasses).then(() => {
			reporter.outputSummary();
		});
	})
	.parse(process.argv);