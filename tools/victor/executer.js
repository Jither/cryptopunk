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
	makeArguments(knownArgDefinitions, customArgDefinitions, argValues, options)
	{
		const args = [];

		// First we add the fixed arguments for the mode
		for (let i = 0; i < knownArgDefinitions.length; i++)
		{
			const argName = knownArgDefinitions[i];
			const argValue = argValues[argName];
			if (typeof argValue !== "undefined")
			{
				args.push(argValues[argName]);
			}
		}

		// Then any custom arguments defined by the test vectors file
		for (let i = 0; i < customArgDefinitions.length; i++)
		{
			const argName = customArgDefinitions[i];
			const argValue = argValues[argName];
			if (typeof argValue !== "undefined")
			{
				args.push(argValues[argName]);
			}
		}

		// And then options
		if (options)
		{
			args.push(options);
		}

		return args;
	}
}

class EncryptDecryptMode extends TestMode
{
	get args()
	{
		return {
			k: VictorExecuter.FORMAT_BYTES,
			p: VictorExecuter.FORMAT_BYTES,
			c: VictorExecuter.FORMAT_BYTES
		};
	}

	execute(transforms, customArgDefinitions, argValues, options)
	{
		const result = new Test();

		const enc = transforms.encrypt;
		try
		{
			const args = this.makeArguments(["p", "k"], customArgDefinitions, argValues, options);
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
			const args = this.makeArguments(["c", "k"], customArgDefinitions, argValues, options);
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
	get args()
	{
		return {
			k: VictorExecuter.FORMAT_BYTES,
			p: VictorExecuter.FORMAT_BYTES,
			c: VictorExecuter.FORMAT_BYTES
		};
	}

	execute(transforms, customArgDefinitions, argValues, options)
	{
		const result = new Test();

		const dec = transforms.decrypt;
		try
		{
			const args = this.makeArguments(["c", "k"], customArgDefinitions, argValues, options);
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
			const args = this.makeArguments(["p", "k"], customArgDefinitions, argValues, options);
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
	get args()
	{
		return {
			m: VictorExecuter.FORMAT_BYTES,
			h: VictorExecuter.FORMAT_BYTES
		};
	}

	execute(transforms, customArgDefinitions, argValues, options)
	{
		const result = new Test();

		const hash = transforms.hash;
		try
		{
			const args = this.makeArguments(["m"], customArgDefinitions, argValues, options);
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
		this.options = {};

		this.argDefinitions = [];
		this.customArgDefinitions = [];
		this.argInputFormats = {};
		this.argCallFormats = {};
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
			// Assign transforms
			case "encrypt":
			case "decrypt":
			case "hash":
				this.transforms[line.prefix] = line.value;
				break;

			// Set title (template)
			case "title":
				this.title = `${this.fileName} » ${line.value}`;
				this.vectorIndex = 0;
				break;

			// Set test mode
			case "mode":
				this.setMode(line.value);
				break;

			// Define custom argument
			case "arg":
				this.addCustomArgument(line.value);
				break;

			// Assign option
			case "option":
				this.addOption(line.value);
				break;

			// Clear custom arguments
			case "no-args":
				this.customArgDefinitions = [];
				break;

			// Clear options
			case "no-options":
				this.options = {};
				break;

			default:
				// Assign argument
				if (this.argDefinitions.indexOf(line.prefix) >= 0)
				{
					this.assignArgument(line);
				}
				// Set argument input format
				else if (/[a-z]-format/.test(line.prefix))
				{
					this.argInputFormats[line.prefix.charAt(0)] = line.value;
				}
				// Assign custom argument
				else if (this.customArgDefinitions.indexOf(line.prefix) >= 0)
				{
					this.assignArgument(line);
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

		const argDefinitions = this.argDefinitions = [];
		const argCallFormats = this.argCallFormats = {};

		const args = this.mode.args;

		for (const arg in args)
		{
			if (!args.hasOwnProperty(arg))
			{
				continue;
			}
			argDefinitions.push(arg);
			argCallFormats[arg] = args[arg];
		}
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
		const inputFormat = this.argInputFormats[line.prefix];
		const callFormat = this.argCallFormats ? this.argCallFormats[line.prefix] : null;
		switch (inputFormat)
		{
			case VictorExecuter.FORMAT_ASCII:
				value = line.value;
				if (callFormat === VictorExecuter.FORMAT_BYTES)
				{
					value = utils.asciiToBytes(value);
				}
				break;
			case VictorExecuter.FORMAT_UTF8:
				value = line.value;
				if (callFormat === VictorExecuter.FORMAT_BYTES)
				{
					throw new Error("UTF-8 not yet supported for bytes arguments");
				}
				break;
			case VictorExecuter.FORMAT_HEX:
				value = this.parseHexValue(line.value);
				break;
			default:
				throw new Error(`Argument '${line.prefix}' has no format defined.`);
		}

		this.args[line.prefix] = value;
	}

	addCustomArgument(arg)
	{
		const name = arg.charAt(0);
		if (this.argDefinitions.indexOf(name) >= 0)
		{
			throw new Error(`Argument name '${name}' is a fixed argument for the current mode.`);
		}
		this.customArgDefinitions.push(name);
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

		const result = this.mode.execute(transforms, this.customArgDefinitions, this.args, passedOptions);
		this.reporter.report(this, result);

		this.vectorIndex++;
		this.args = {};
	}
}

VictorExecuter.EMPTY_LINE = "empty";
VictorExecuter.MODE_NONE = "none";
VictorExecuter.MODE_ENCRYPT_DECRYPT = "encrypt-decrypt";
VictorExecuter.MODE_HASH = "hash";
VictorExecuter.FORMAT_BYTES = "bytes";
VictorExecuter.FORMAT_HEX = "hex";
VictorExecuter.FORMAT_ASCII = "ascii";
VictorExecuter.FORMAT_UTF8 = "utf-8";

module.exports = VictorExecuter;