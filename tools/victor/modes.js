"use strict";

const TestResult = require("./testresult"),
	formats = require("./formats"),
	constants = require("./constants");

class TestMode
{
	makeArguments(knownArgDefinitions, customArgDefinitions, argValues)
	{
		const args = [];

		// First we add the fixed arguments for the mode
		for (let i = 0; i < knownArgDefinitions.length; i++)
		{
			const argName = knownArgDefinitions[i];
			const argValue = argValues[argName];
			if (argValue !== null && argValue !== undefined)
			{
				if (argValue.isDirective)
				{
					throw new Error("Directives (e.g. ranges) cannot be used as input arguments.");
				}
				args.push(argValues[argName]);
			}
		}

		// Then any custom arguments defined by the test vectors file
		for (let i = 0; i < customArgDefinitions.length; i++)
		{
			const argName = customArgDefinitions[i];
			const argValue = argValues[argName];
			if (argValue !== null && argValue !== undefined)
			{
				if (argValue.isDirective)
				{
					throw new Error("Directives (e.g. ranges) cannot be used as input arguments.");
				}
				args.push(argValues[argName]);
			}
		}

		return args;
	}

	checkSkip(settings, args)
	{
		if (settings.skipLong)
		{
			for (const key in args)
			{
				const value = args[key];
				if (value)
				{
					if (value.skip)
					{
						return `${key} length > ${constants.FAST_MAX_BYTE_LENGTH}`;
					}
					if (value.length > constants.FAST_MAX_BYTE_LENGTH)
					{
						return `${key} length ${value.length} > ${constants.FAST_MAX_BYTE_LENGTH}`;
					}
				}
			}
		}
		return null;
	}
}

class CipherMode extends TestMode
{
	get args()
	{
		return {
			k: formats.BYTES,
			p: formats.BYTES,
			c: formats.BYTES
		};
	}
	
	decrypt(transforms, customArgDefinitions, argValues, options, result)
	{
		const dec = transforms.decrypt;
		try
		{
			const args = this.makeArguments(["c", "k"], customArgDefinitions, argValues);
			dec.resetOptions();
			if (options)
			{
				dec.setOptions(options);
			}
			const decResult = dec.transform.apply(dec, args);
			result.assertBytesEqual(decResult, argValues.p);
		}
		catch (e)
		{
			result.addError(e);
		}
	}

	encrypt(transforms, customArgDefinitions, argValues, options, result)
	{
		const enc = transforms.encrypt;
		try
		{
			const args = this.makeArguments(["p", "k"], customArgDefinitions, argValues);
			enc.resetOptions();
			if (options)
			{
				enc.setOptions(options);
			}
			const encResult = enc.transform.apply(enc, args);
			result.assertBytesEqual(encResult, argValues.c);
		}
		catch (e)
		{
			result.addError(e);
		}
	}
}

class EncryptMode extends CipherMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.encrypt(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class DecryptMode extends CipherMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.decrypt(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class EncryptDecryptMode extends CipherMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.encrypt(transforms, customArgDefinitions, argValues, options, result);

		this.decrypt(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class DecryptEncryptMode extends CipherMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.decrypt(transforms, customArgDefinitions, argValues, options, result);

		this.encrypt(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class TextCipherMode extends TestMode
{
	get args()
	{
		return {
			k: formats.TEXT,
			p: formats.TEXT,
			c: formats.TEXT
		};
	}

	encrypt(transforms, customArgDefinitions, argValues, options, result)
	{
		const enc = transforms.encrypt;
		try
		{
			const args = this.makeArguments(["p", "k"], customArgDefinitions, argValues);
			enc.resetOptions();
			if (options)
			{
				enc.setOptions(options);
			}
			const encResult = enc.transform.apply(enc, args);
			result.assertTextsEqual(encResult, argValues.c);
		}
		catch (e)
		{
			result.addError(e);
		}
	}

	decrypt(transforms, customArgDefinitions, argValues, options, result)
	{
		const dec = transforms.decrypt;
		try
		{
			const args = this.makeArguments(["c", "k"], customArgDefinitions, argValues);
			dec.resetOptions();
			if (options)
			{
				dec.setOptions(options);
			}
			const decResult = dec.transform.apply(dec, args);
			result.assertTextsEqual(decResult, argValues.p);
		}
		catch (e)
		{
			result.addError(e);
		}
	}
}

class EncryptDecryptTextMode extends TextCipherMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.encrypt(transforms, customArgDefinitions, argValues, options, result);

		this.decrypt(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class EncryptTextMode extends TextCipherMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.encrypt(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class DecryptTextMode extends TextCipherMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.decrypt(transforms, customArgDefinitions, argValues, options, result);

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

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		const hash = transforms.hash;
		try
		{
			const args = this.makeArguments(["m"], customArgDefinitions, argValues);
			hash.resetOptions();
			if (options)
			{
				hash.setOptions(options);
			}
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

class EncoderMode extends TestMode
{
	get args()
	{
		return {
			t: formats.TEXT,
			b: formats.BYTES
		};
	}

	encode(transforms, customArgDefinitions, argValues, options, result)
	{
		const enc = transforms.encode;
		try
		{
			const args = this.makeArguments(["b"], customArgDefinitions, argValues);
			enc.resetOptions();
			if (options)
			{
				enc.setOptions(options);
			}
			const encResult = enc.transform.apply(enc, args);
			result.assertTextsEqual(encResult, argValues.t);
		}
		catch (e)
		{
			result.addError(e);
		}
	}

	decode(transforms, customArgDefinitions, argValues, options, result)
	{
		const dec = transforms.decode;
		try
		{
			const args = this.makeArguments(["t"], customArgDefinitions, argValues);
			dec.resetOptions();
			if (options)
			{
				dec.setOptions(options);
			}
			const decResult = dec.transform.apply(dec, args);
			result.assertBytesEqual(decResult, argValues.b);
		}
		catch (e)
		{
			result.addError(e);
		}
	}
}

class EncodeDecodeTextMode extends EncoderMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.encode(transforms, customArgDefinitions, argValues, options, result);

		this.decode(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class EncodeTextMode extends EncoderMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.encode(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

class DecodeTextMode extends EncoderMode
{
	execute(transforms, customArgDefinitions, argValues, options, settings)
	{
		const result = new TestResult();

		const skipReason = this.checkSkip(settings, argValues);
		if (skipReason)
		{
			return result.skip(skipReason);
		}

		this.decode(transforms, customArgDefinitions, argValues, options, result);

		return result;
	}
}

module.exports = {
	EncryptMode,
	DecryptMode,
	EncryptDecryptMode,
	EncryptDecryptTextMode,
	EncryptTextMode,
	DecryptTextMode,
	DecryptEncryptMode,
	EncodeDecodeTextMode,
	EncodeTextMode,
	DecodeTextMode,
	HashMode
};