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
		return this.fails.map(fail => `Expected: ${fail.expected} ::: Actual: ${fail.actual}`)
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

class TestMode
{
	makeArguments(knownArgDefinitions, argDefinitions, argValues, options)
	{
		const args = [];

		for (let i = 0; i < knownArgDefinitions.length; i++)
		{
			const argName = knownArgDefinitions[i];
			args.push(argValues[argName]);
		}

		for (let i = 0; i < argDefinitions.length; i++)
		{
			const argName = argDefinitions[i];
			args.push(argValues[argName]);
		}

		if (options)
		{
			args.push(options);
		}

		return args;
	}
}

class EncryptDecryptMode extends TestMode
{
	get argFormats()
	{
		return {
			k: "bytes",
			p: "bytes",
			c: "bytes"
		};
	}

	execute(transforms, argDefinitions, argValues, options)
	{
		const result = new Test();

		const enc = transforms.encrypt;
		try
		{
			const args = this.makeArguments(["p", "k"], argDefinitions, argValues, options);
			const encResult = enc.transform.apply(enc, args);
			result.assertBytesEqual(encResult, argValues.c);
		}
		catch (e)
		{
			result.addError(e);
		}

		const dec = transforms.decrypt;
		try
		{
			const args = this.makeArguments(["c", "k"], argDefinitions, argValues, options);
			const decResult = dec.transform.apply(dec, args);
			result.assertBytesEqual(decResult, argValues.p);
		}
		catch (e)
		{
			result.addError(e);
		}

		return result;
	}
}

class DecryptEncryptMode extends TestMode
{
	get argFormats()
	{
		return {
			k: "bytes",
			p: "bytes",
			c: "bytes"
		};
	}

	execute(transforms, argDefinitions, argValues, options)
	{
		const result = new Test();

		const dec = transforms.decrypt;
		try
		{
			const args = this.makeArguments(["c", "k"], argDefinitions, argValues, options);
			const decResult = dec.transform.apply(dec, args);
			result.assertBytesEqual(decResult, argValues.p);
		}
		catch (e)
		{
			result.addError(e);
		}

		const enc = transforms.encrypt;
		try
		{
			const args = this.makeArguments(["p", "k"], argDefinitions, argValues, options);
			const encResult = enc.transform.apply(enc, args);
			result.assertBytesEqual(encResult, argValues.c);
		}
		catch (e)
		{
			result.addError(e);
		}

		return result;
	}
}

class HashMode extends TestMode
{
	get argFormats()
	{
		return {
			m: "bytes",
			h: "bytes"
		};
	}

	execute(transforms, argDefinitions, argValues, options)
	{
		const result = new Test();

		const hash = transforms.hash;
		try
		{
			const args = this.makeArguments(["m"], argDefinitions, argValues, options);
			const hashResult = hash.transform.apply(hash, args);
			result.assertBytesEqual(hashResult, argValues.h);
		}
		catch (e)
		{
			result.addError(e);
		}

		return result;
	}
}

const TEST_MODES = {
	"encrypt-decrypt": EncryptDecryptMode,
	"decrypt-encrypt": DecryptEncryptMode,
	"hash": HashMode
};

class VictorExecuter
{
	constructor(fileName, reporter, transformClasses)
	{
		this.fileName = fileName;
		this.reporter = reporter;
		this.transformClasses = transformClasses;
		this.title = "Test vector";
		this.transforms = {};
		this.formats = {};
		this.destFormats = {};
		this.options = {};

		this.argDefinitions = [];
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
			case "hash":
				this.transforms[line.prefix] = line.value;
				break;

			case "title":
				this.title = `${this.fileName} » ${line.value}`;
				this.vectorIndex = 0;
				break;

			case "mode":
				this.setMode(line.value);
				break;

			case "c-format": // ciphertext
			case "k-format": // key
			case "p-format": // plaintext
			case "m-format": // message
			case "h-format": // hash
				this.formats[line.prefix.charAt(0)] = line.value;
				break;

			case "c": // ciphertext
			case "k": // key
			case "p": // plaintext
			case "m": // message
			case "h": // hash
				this.assignArgument(line);
				break;

			case "arg":
				this.addArgument(line.value);
				break;

			case "option":
				this.addOption(line.value);
				break;

			case "no-args":
				this.argDefinitions = [];
				break;

			case "no-options":
				this.options = {};
				break;

			default:
				// Custom arguments
				if (this.argDefinitions.indexOf(line.prefix) >= 0)
				{
					this.assignArgument(line);
				}
				// Custom argument formats
				else if (/[a-z]-format/.test(line.prefix))
				{
					this.formats[line.prefix.charAt(0)] = line.value;
				}
				else
				{
					throw new Error(`Unexpected line prefix: ${line.prefix}`);
				}
				break;
		}
	}

	setMode(value)
	{
		const modeClass = TEST_MODES[value];
		if (!modeClass)
		{
			throw new Error(`Unknown test mode: ${value}`);
		}
		this.mode = new modeClass();
		this.destFormats = this.mode.argFormats;
	}

	parseHexValue(value)
	{
		// repeat AF x 32
		const repeat = /^repeat\s+([a-z0-f ]+)\s*x\s*(\d+)$/i.exec(value);
		if (repeat)
		{
			const hex = repeat[1];
			const count = parseInt(repeat[2], 10);
			value = hex.repeat(count);
		}
		return utils.hexToBytes(value);
	}

	assignArgument(line)
	{
		let value;
		const format = this.formats[line.prefix];
		const destFormat = this.destFormats ? this.destFormats[line.prefix] : null;
		switch (format)
		{
			case VictorExecuter.FORMAT_ASCII:
				value = line.value;
				if (destFormat === "bytes")
				{
					value = utils.asciiToBytes(value);
				}
				break;
			case VictorExecuter.FORMAT_UTF8:
				value = line.value;
				if (destFormat === "bytes")
				{
					throw new Error("UTF-8 not yet supported for bytes arguments");
				}
				break;
			case VictorExecuter.FORMAT_HEX:
				value = this.parseHexValue(line.value);
				break;
			default:
				console.log(line);
				throw new Error(`Argument '${line.prefix}' has no format defined.`);
		}

		this.args[line.prefix] = value;
	}

	addArgument(arg)
	{
		const name = arg.charAt(0);
		this.argDefinitions.push(name);
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

		if (!this.mode)
		{
			throw new Error(`No test mode set.`);
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

		const result = this.mode.execute(transforms, this.argDefinitions, this.args, passedOptions);
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