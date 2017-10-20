"use strict";

const chalk = require("chalk"),
	figures = require("figures"),
	utils = require("./utils");

const COLORS = {
	error: chalk.red,
	warning: chalk.yellow,
	pass: chalk.green,
	fail: chalk.red,
	summary: chalk.white,
	detail: chalk.white
};

const VERBOSE_TYPES = ["pass"];

class Reporter
{
	constructor(verbose)
	{
		this.verbose = verbose;
		this.testCount = 0;
		this.skipCount = 0;
		this.failCount = 0;
		this.passCount = 0;
		this.errorCount = 0;
		this.warningCount = 0;
	}

	log(type, message)
	{
		if (this.previousWasVerbose)
		{
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
		}
		process.stdout.write(" " + COLORS[type](message));

		const isVerboseType = VERBOSE_TYPES.indexOf(type) >= 0;
		this.previousWasVerbose = isVerboseType;

		if (this.verbose || !isVerboseType)
		{
			process.stdout.write("\n");
		}
	}

	report(executer, test)
	{
		this.testCount++;

		const title = this.renderTitle(executer);

		if (!test.isSuccess)
		{
			let logType;
			if (test.isError)
			{
				this.errorCount++;
				logType = "error";
			}
			if (test.isFail)
			{
				this.failCount++;
				logType = "fail";
			}
			if (test.isWarning)
			{
				this.warningCount++;
				logType = "warning";
			}
			this.log(logType, figures.cross + "  " + title);
			for (let i = 0; i < test.messages.length; i++)
			{
				this.log("detail", "     " + test.messages[i]);
			}
		}
		else
		{
			this.log("pass", figures.tick + "  " + title);
			this.passCount++;
		}
	}

	renderTitle(executer)
	{
		let title = executer.title;
		let hasTemplate = false;
		title = title.replace(/\{([^\}]+)\}/g, (match, p1) => {
			hasTemplate = true;
			switch (p1)
			{
				case "key":
					if (executer.args.k)
					{
						if (executer.args.k instanceof Uint8Array)
						{
							return utils.bytesToHex(executer.args.k);
						}
						return executer.args.k;
					}
					break;
				case "keybits":
					if (executer.args.k)
					{
						return executer.args.k.length * 8;
					}
					break;
				case "msgbits":
					if (executer.args.m)
					{
						return executer.args.m.length * 8;
					}
					break;
				case "plaintext":
					if (executer.args.p)
					{
						return executer.args.p;
					}
					break;
				case "ciphertext":
					if (executer.args.c)
					{
						return executer.args.c;
					}
					break;
				case "index":
					return executer.vectorIndex;
				default:
					// Look in options
					if (executer.options.hasOwnProperty(p1))
					{
						return executer.options[p1];
					}
					break;
			}
			return match;
		});

		// Templated titles must take care of their own indexing (mostly it isn't needed)
		if (!hasTemplate)
		{
			title += " #" + executer.vectorIndex;
		}
		return title;
	}

	outputSummary()
	{
		let failed = false;

		let summary = `Tested: ${this.testCount}. Passed: ${this.passCount}.`;
		if (this.failCount > 0)
		{
			summary += ` Failed: ${this.failCount}.`;
			failed = true;
		}
		if (this.errorCount > 0)
		{
			summary += ` Errors: ${this.errorCount}.`;
			failed = true;
		}
		if (this.warningCount > 0)
		{
			summary += ` Warnings: ${this.warningCount}.`;
		}

		if (failed)
		{
			summary = COLORS.fail(summary);
		}
		else
		{
			summary = COLORS.pass(summary);
		}
		this.log("summary", "");
		this.log("summary", summary);
	}
}

module.exports = Reporter;
