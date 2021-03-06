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
		const result = [];
		for (let i = 0; i < this.fails.length; i++)
		{
			const fail = this.fails[i];
			result.push(`Expected: ${fail.expected}`);
			result.push(`Actual  : ${fail.actual}`);
		}
		return result.concat(this.errors.map(error => `Error: ${error}`))
			.concat(this.warnings.map(warning => `${warning}`));
	}

	assertTextsEqual(actual, expected)
	{
		if (actual !== expected)
		{
			this.fails.push({ actual, expected });
		}
	}

	assertXorDigestEquals(actual, expectedDigest)
	{
		const actualLength = actual.length;
		const digestLength = expectedDigest.length;

		if (actualLength % digestLength !== 0)
		{
			throw new Error(`Result length (${actualLength}) isn't a multiple of digest length (${digestLength}).`);
		}

		const rangeCount = actualLength / digestLength;
		const actualDigest = new Uint8Array(digestLength);
		for (let i = 0; i < actualLength; i++)
		{
			actualDigest[i % digestLength] ^= actual[i];
		}

		this.assertBytesEqual(actualDigest, expectedDigest);
	}

	assertMultiMatch(actual, expected)
	{
		let success = true;
		for (const entry of expected)
		{
			switch (entry.directive)
			{
				case "range":
					const actualRange = actual.subarray(entry.from, entry.to + 1);
					this.assertBytesEqual(actualRange, entry.value);
					break;
				case "xor-digest":
					this.assertXorDigestEquals(actual, entry.value);
					break;
				default:
					throw new Error("Unknown multi hex directive");
			}
		}
	}

	assertBytesEqual(actual, expected)
	{
		if (expected.isMulti)
		{
			this.assertMultiMatch(actual, expected);
			return;
		}

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