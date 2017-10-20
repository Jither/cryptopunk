"use strict";

const
	modes = require("./modes"),
	formats = require("./formats"),
	utils = require("./utils"),
	constants = require("./constants");

const TEST_MODES = {
	"encrypt": modes.EncryptMode,
	"decrypt": modes.DecryptMode,
	"encrypt-decrypt": modes.EncryptDecryptMode,
	"decrypt-encrypt": modes.DecryptEncryptMode,
	"encrypt-decrypt-text": modes.EncryptDecryptTextMode,
	"encrypt-text": modes.EncryptTextMode,
	"decrypt-text": modes.DecryptTextMode,
	"encode-decode-text": modes.EncodeDecodeTextMode,
	"encode-text": modes.EncodeTextMode,
	"decode-text": modes.DecodeTextMode,
	"hash": modes.HashMode
};

class VictorExecuter
{
	constructor(fileName, reporter, transformClasses, settings)
	{
		this.fileName = fileName;
		this.reporter = reporter;
		this.transformClasses = transformClasses;
		this.settings = settings;

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
			case "encode":
			case "decode":
			case "hash":
				this.assignTransform(line.prefix, line.value);
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

			// Clear options/custom arguments/etc.
			case "clear":
				switch (line.value)
				{
					case "options":
						this.options = {};
						break;
					case "args":
						this.customArgDefinitions = [];
						break;
				}
				break;

			default:
				// Assign argument
				if (this.argDefinitions.indexOf(line.prefix) >= 0)
				{
					this.assignArgument(line.prefix, line.value);
				}
				// Set argument input format
				else if (/[a-z]-format/.test(line.prefix))
				{
					this.argInputFormats[line.prefix.charAt(0)] = line.value;
				}
				// Assign custom argument
				else if (this.customArgDefinitions.indexOf(line.prefix) >= 0)
				{
					this.assignArgument(line.prefix, line.value);
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
		// range 00..63 = afafaf...
		const range = /^range\s+(\d+)\s*\.\.\s*(\d+)\s*=\s*(.*)/i.exec(value);
		if (range)
		{
			return this.parseRange(range);
		}

		// xor-digest = afafaf...
		const digest = /^xor-digest\s+=\s+(.*)/i.exec(value);
		if (digest)
		{
			return this.parseDigest(digest);
		}

		// repeat AF x 32 => af af af af af...
		const repeat = /^repeat\s+([a-f0-9 ]+)\s*x\s*(\d+)$/i.exec(value);
		if (repeat)
		{
			return this.parseRepeat(repeat);
		}

		// pattern 03..05 x 5 => 03 04 05 03 04
		const pattern = /^pattern\s+([a-f0-9]{2})\s*\.\.\s*([a-f0-9]{2})\s*x\s*(\d+)$/i.exec(value);
		if (pattern)
		{
			return this.parsePattern(pattern);
		}

		// runlength x 32 => 000102030405060708090a0b0c0d0e0f1011121314...
		const runlength = /^runlength\s+x\s*(\d+)$/i.exec(value);
		if (runlength)
		{
			return this.parseRunLength(runlength);
		}

		return utils.hexToBytes(value);
	}

	parseDigest(digest)
	{
		const value = this.parseHexValue(digest[1]);
		return { directive: "xor-digest", value };
	}

	parseRange(range)
	{
		const from = parseInt(range[1], 10);
		const to = parseInt(range[2], 10);
		const value = this.parseHexValue(range[3]);
		return { directive: "range", from, to, value };
	}

	parseRepeat(repeat)
	{
		const hex = repeat[1];
		const count = parseInt(repeat[2], 10);
		
		if (this.settings.fast && (count * hex.length / 2) > constants.FAST_MAX_BYTE_LENGTH)
		{
			return { skip: true };
		}
		
		return utils.hexToBytes(hex.repeat(count));
	}

	parseRunLength(runlength)
	{
		const count = parseInt(runlength[1], 10);
		
		if (this.settings.fast && count > constants.FAST_MAX_BYTE_LENGTH)
		{
			return { skip: true };
		}
		
		const result = new Uint8Array(count);
		for (let i = 0; i < result.length; i++)
		{
			result[i] = i & 0xff;
		}
		return result;
	}

	parsePattern(pattern)
	{
		const hex1 = pattern[1];
		const hex2 = pattern[2];
		const count = parseInt(pattern[3], 10);

		if (this.settings.fast && count > constants.FAST_MAX_BYTE_LENGTH)
		{
			return { skip: true };
		}

		const start = parseInt(hex1, 16);
		const end = parseInt(hex2, 16);

		if (start > end)
		{
			throw new Error(`Pattern start (${hex1}) must be <= pattern end (${hex2}).`);
		}

		const result = new Uint8Array(count);
		let value = start;
		for (let i = 0; i < result.length; i++)
		{
			result[i] = value++;
			if (value > end)
			{
				value = start;
			}
		}

		return result;
	}

	assignTransform(name, className)
	{
		const tfClass = this.transformClasses[className];
		if (!tfClass)
		{
			throw new Error(`Could not locate transform class for ${name}: ${className}.`);
		}
		this.transforms[name] = new tfClass();
	}

	assignArgument(name, value)
	{
		const inputFormat = this.argInputFormats[name];
		const callFormat = this.argCallFormats ? this.argCallFormats[name] : null;
		switch (inputFormat)
		{
			case formats.ASCII:
				value = utils.applyEscapes(value);
				if (callFormat === formats.BYTES)
				{
					value = utils.asciiToBytes(value);
				}
				break;
			case formats.UTF8:
				value = utils.applyEscapes(value);
				if (callFormat === formats.BYTES)
				{
					throw new Error("UTF-8 not yet supported for bytes arguments");
				}
				break;
			case formats.HEX:
				value = this.parseHexValue(value);
				if (value.directive)
				{
					// Directives describe e.g. hex ranges - there can be more than one of those per test,
					// so add it to an array.
					let arr = this.args[name];
					if (arr && !arr.isMulti)
					{
						throw new Error(`Cannot add ${value.directive} directive for argument '${name}' when non-directives have already been used.`);
					}
					arr = arr || [];
					arr.push(value);
					value = arr;
					value.isMulti = true;
				}
				break;
			default:
				throw new Error(`Argument '${name}' has no format defined.`);
		}

		this.args[name] = value;
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
		let value = pair[1];
		const valueIsInt = /^[0-9]+$/.test(value); // We want the *entire* string to be a number - 1,15,7 is a string
		if (!valueIsInt)
		{
			if (value === "true" || value === "false")
			{
				value = (value === "true");
			}
		}
		else
		{
			value = parseInt(value, 10);
		}

		this.options[name] = value;
	}

	fillCustomArguments()
	{
		for (let i = 0; i < this.customArgDefinitions.length; i++)
		{
			const def = this.customArgDefinitions[i];
			if (typeof this.args[def] === "undefined")
			{
				this.args[def] = null;
			}
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

		const passedOptions = Object.keys(this.options).length === 0 ? undefined : this.options;

		this.fillCustomArguments();

		const result = this.mode.execute(this.transforms, this.customArgDefinitions, this.args, passedOptions, this.settings);
		this.reporter.report(this, result);

		this.vectorIndex++;
		this.args = {};
	}
}

VictorExecuter.EMPTY_LINE = "empty";

module.exports = VictorExecuter;