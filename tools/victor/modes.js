"use strict";

const TestResult = require("./testresult"),
	formats = require("./formats"),
	constants = require("./constants");

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

	checkSkip(settings, message)
	{
		if (settings.fast)
		{
			if (message)
			{
				if (message.skip)
				{
					return `message length > ${constants.FAST_MAX_BYTE_LENGTH}`;
				}
				if (message.length >  constants.FAST_MAX_BYTE_LENGTH)
				{
					return `message length ${length} > ${constants.FAST_MAX_BYTE_LENGTH}`;
				}
			}
		}
		return null;
	}
}

class EncryptDecryptMode extends TestMode
{
	get args()
	{
		return {
			k: formats.BYTES,
			p: formats.BYTES,
			c: formats.BYTES
		};
	}

	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

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

class EncryptDecryptTextMode extends TestMode
{
	get args()
	{
		return {
			k: formats.UTF8,
			p: formats.UTF8,
			c: formats.UTF8
		};
	}

	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

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
			k: formats.BYTES,
			p: formats.BYTES,
			c: formats.BYTES
		};
	}

	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

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
			m: formats.BYTES,
			h: formats.BYTES
		};
	}

	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues.m);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

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

module.exports = {
	EncryptDecryptMode,
	EncryptDecryptTextMode,
	DecryptEncryptMode,
	HashMode
};