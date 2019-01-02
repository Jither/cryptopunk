import { Transform, TransformError } from "./transforms";
import { removeWhiteSpace } from "../cryptopunk.strings";
import { HexToBytesTransform } from "./hex";
import bigint from "../jither.bigint";

class KeyboardInputGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("string", "String")
			.addOption("input", "Input", "");
	}

	transform()
	{
		return this.options.input;
	}
}

// Just a simple wrapper around HexToBytesTransform
class HexInputGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("bytes", "Bytes")
			.addOption("input", "Input", "");

		this.hexToBytesTransform = new HexToBytesTransform();
	}

	transform()
	{
		return this.hexToBytesTransform.transform(this.options.input);
	}
}

class BigIntegerGenerator extends Transform
{
	constructor()
	{
		super();
		this
			.addOutput("bigint", "Big Integer")
			.addOption("input", "Input", "0");
	}

	transform()
	{
		try
		{
			return bigint(this.options.input || "0");
		}
		catch (e)
		{
			throw new TransformError(e.message);
		}
	}
}

class RandomBytesGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("bytes", "Bytes")
			.addOption("length", "Length", 16, { min: 1 });
	}

	transform()
	{
		const result = new Uint8Array(this.options.length);
		window.crypto.getRandomValues(result);

		return result;
	}
}

class NullBytesGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("bytes", "Bytes")
			.addOption("length", "Length", 16, { min: 1 });
	}

	transform()
	{
		// TypedArrays are initialized to zero
		const result = new Uint8Array(this.options.length);
		return result;
	}
}

class KeyedAlphabetGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("string", "Keyed alphabet")
			.addOption("baseAlphabet", "Base alphabet", "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
			.addOption("keyword", "Keyword", "KEYWORD", { type: "short-string" })
			.addOption("remove", "Remove characters", "", { type: "short-string" })
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform()
	{
		const combined = removeWhiteSpace(this.options.keyword + this.options.baseAlphabet);
		const ignoreCase = this.options.ignoreCase;

		let result = "", resultCompare = "";
		let remove = this.options.remove.toUpperCase();

		if (ignoreCase)
		{
			remove = remove.toUpperCase();
		}

		for (let i = 0; i < combined.length; i++)
		{
			const originalC = combined.charAt(i);
			let c = originalC;
			if (ignoreCase)
			{
				c = c.toUpperCase();
			}
			if (resultCompare.indexOf(c) >= 0 || remove.indexOf(c) >= 0)
			{
				continue;
			}
			result += originalC;
			resultCompare += c;
		}

		return result;
	}
}

export {
	KeyboardInputGenerator,
	HexInputGenerator,
	KeyedAlphabetGenerator,
	RandomBytesGenerator,
	NullBytesGenerator,
	BigIntegerGenerator
};