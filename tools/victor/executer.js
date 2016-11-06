"use strict";

const utils = require("./utils");

class Test
{
	constructor()
	{
		this.fails = [];
		this.errors = [];
	}

	get isSuccess()
	{
		return this.fails.length === 0 && this.errors.length === 0;
	}

	get isError()
	{
		return this.errors.length > 0;
	}

	get isFail()
	{
		return this.fails.length > 0;
	}

	get messages()
	{
		return this.fails.map(fail => `Expected: ${fail.expected} - Actual: ${fail.actual}`)
			.concat(this.errors.map(error => `Error: ${error}`));
	}

	assertEqual(actual, expected)
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

}

function testEncryptDecrypt(transforms, args, options)
{
	const result = new Test();

	const enc = transforms.encrypt;
	try
	{
		const encResult = enc.transform(args.p, args.k, options);
		result.assertBytesEqual(encResult, args.c);
	}
	catch (e)
	{
		result.addError(e);
	}

	const dec = transforms.decrypt;
	try
	{
		const decResult = dec.transform(args.c, args.k, options);
		result.assertBytesEqual(decResult, args.p);
	}
	catch (e)
	{
		result.addError(e);
	}

	return result;
}

function testDecryptEncrypt(transforms, args, options)
{
	const result = new Test();

	const dec = transforms.decrypt;
	try
	{
		const decResult = dec.transform(args.c, args.k, options);
		result.assertBytesEqual(decResult, args.p);
	}
	catch (e)
	{
		result.addError(e);
	}

	const enc = transforms.encrypt;
	try
	{
		const encResult = enc.transform(args.p, args.k, options);
		result.assertBytesEqual(encResult, args.c);
	}
	catch (e)
	{
		result.addError(e);
	}

	return result;
}

const TEST_METHODS = {
	"encrypt-decrypt": testEncryptDecrypt,
	"decrypt-encrypt": testDecryptEncrypt
};

class VictorExecuter
{
	constructor(fileName, reporter, transformClasses)
	{
		this.fileName = fileName;
		this.reporter = reporter;
		this.transformClasses = transformClasses;
		this.mode = VictorExecuter.MODE_NONE;
		this.title = "Test vector";
		this.transforms = {};
		this.formats = {};
		this.options = {};
		this.args = {};
		this.vectorIndex = 0;
	}

	handleLine(line)
	{
		if (line === VictorExecuter.EMPTY_LINE)
		{
			this.execute();
			return;
		}
		switch (line.prefix)
		{
			// Transforms
			case "encrypt":
			case "decrypt":
				this.transforms[line.prefix] = line.value;
				break;

			case "title":
				this.title = `${this.fileName} » ${line.value}`;
				this.vectorIndex = 0;
				break;
			case "mode":
				this.mode = line.value;
				break;
			case "c-format": // ciphertext
			case "k-format": // key
			case "p-format": // plaintext
			case "m-format": // message
				this.formats[line.prefix.charAt(0)] = line.value;
				break;
			case "c": // ciphertext
			case "k": // key
			case "p": // plaintext
			case "m": // message
				this.assignArgument(line);
				break;
			case "option":
				this.addOption(line.value);
				break;
			case "no-options":
				this.options = {};
				break;
			default:
				throw new Error("Unexpected line prefix: ${line.prefix}");
				break;
		}
	}

	assignArgument(line)
	{
		let value;
		switch (this.formats[line.prefix])
		{
			case VictorExecuter.FORMAT_ASCII:
				value = line.value;
				break;
			case VictorExecuter.FORMAT_UTF8:
				value = line.value;
				break;
			default:
			case VictorExecuter.FORMAT_HEX:
				value = utils.hexToBytes(line.value);
				break;
		}

		this.args[line.prefix] = value;
	}

	addOption(option)
	{
		const pair = option.split("=").map(p => p.trim());

		const name = pair[0];
		const value = pair[1];
		const valueAsInt = parseInt(value, 10);
		if (isNaN(valueAsInt))
		{
			this.options[name] = value;
		}
		else
		{
			this.options[name] = valueAsInt;
		}
	}

	execute()
	{
		if (Object.keys(this.args).length === 0)
		{
			// No arguments = no test
			return;
		}

		const testMethod = TEST_METHODS[this.mode];
		if (!testMethod)
		{
			throw new Error(`Unknown test mode: ${this.mode}`);
		}

		const transforms = {};
		for (const tf in this.transforms)
		{
			if (!this.transforms.hasOwnProperty(tf))
			{
				continue;
			}
			const tfClassName = this.transforms[tf];
			const tfClass = this.transformClasses[tfClassName];
			if (!tfClass)
			{
				throw new Error(`Could not locate transform class for ${tf}: ${tfClassName}.`);
			}
			transforms[tf] = new tfClass();
		}

		const passedOptions = Object.keys(this.options).length === 0 ? undefined : this.options;

		const result = testMethod(transforms, this.args, passedOptions);
		this.reporter.report(this, result);

		this.vectorIndex++;
		this.args = {};
	}
}

VictorExecuter.EMPTY_LINE = "empty";
VictorExecuter.MODE_NONE = "none";
VictorExecuter.MODE_ENCRYPT_DECRYPT = "encrypt-decrypt";
VictorExecuter.MODE_HASH = "hash";
VictorExecuter.FORMAT_HEX = "hex";
VictorExecuter.FORMAT_ASCII = "ascii";
VictorExecuter.FORMAT_UTF8 = "utf-8";

module.exports = VictorExecuter;