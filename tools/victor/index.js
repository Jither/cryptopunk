#!/usr/bin/env node
"use strict";

const
	commander = require("commander"),
	fs = require("fs"),
	path = require("path"),
	readline = require("readline"),
	glob = require("glob"),
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

function testFile(filePath, reporter, transformClasses, options)
{
	const fileName = path.basename(filePath, ".vectors");
	if (options.filter && fileName !== options.filter)
	{
		// Skip file not in filter
		return Promise.resolve();
	}

	const executer = new VictorExecuter(fileName, reporter, transformClasses, { fast: options.fast });
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

function testFolder(folder, reporter, transformClasses, options)
{
	return new Promise((resolve, reject) => {
		glob(path.join(folder, "**/*.vectors"), (err, files) => {
			if (err)
			{
				return reject(err);
			}
			const filePromises = [];
			files.forEach(file => {
				filePromises.push(testFile(file, reporter, transformClasses, options));
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
	.arguments("<folder or file>")
	.option("-t, --transforms <path>", "Javascript exposing transforms")
	.option("-v, --verbose", "Verbose output")
	.option("-s, --skip-long", "Exclude long vectors")
	.option("-f, --filter <name>", "Only run specified file")
	.action((path, options) => {
		const transformClasses = loadTransforms(options.transforms);
		const reporter = new Reporter(options.verbose);

		const stats = fs.statSync(path);

		if (stats.isDirectory())
		{
			testFolder(path, reporter, transformClasses, options).then(() => {
				reporter.outputSummary();
			});
		}
		else
		{
			testFile(path, reporter, transformClasses, options).then(() => {
				reporter.outputSummary();
			});
		}
	})
	.parse(process.argv);