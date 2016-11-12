"use strict";

const utils = require("./utils");

class TestResult
{
	constructor()
	{
		this.fails = [];
		this.errors = [];
		this.warnings = [];
	}

	get isSuccess()
	{
		return this.fails.length === 0 && this.errors.length === 0 && this.warnings.length === 0;
	}

	get isError()
	{
		return this.errors.length > 0;
	}

	get isFail()
	{
		return this.fails.length > 0;
	}

	get isWarning()
	{
		return this.warnings.length > 0;
	}

	get messages()
	{
		return this.fails.map(fail => `Expected: ${fail.expected} ::: Actual: ${fail.actual}`)
			.concat(this.errors.map(error => `Error: ${error}`))
			.concat(this.warnings.map(warning => `${warning}`));
	}

	assertTextsEqual(actual, expected)
	{
		if (actual !== expected)
		{
			this.fails.push({ actual, expected });
		}
	}

	assertBytesEqual(actual, expected)
	{
		let success = true;
		if (actual.length !== expected.length)
		{
			success = false;
		}
		for (let i = 0; i < actual.length; i++)
		{
			if (actual[i] !== expected[i])
			{
				success = false;
				break;
			}
		}

		if (!success)
		{
			this.fails.push({ actual: utils.bytesToHex(actual), expected: utils.bytesToHex(expected) });
		}
	}

	addError(e)
	{
		this.errors.push(`${e.name}: ${e.message}`);
	}

	skip(message)
	{
		this.warnings.push(`Skipped: ${message}`);
		return this;
	}
}

module.exports = TestResult;