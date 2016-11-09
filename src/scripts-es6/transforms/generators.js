import { Transform } from "./transforms";
import { escapeForRegex, removeWhiteSpace } from "../cryptopunk.strings";

class KeyboardInputGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("string", "String")
			.addOption("input", "Input", "");
	}

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		return options.input;
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

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		const result = new Uint8Array(options.length);
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

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		// TypedArrays are initialized to zero
		const result = new Uint8Array(options.length);
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

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);

		let combined = removeWhiteSpace(options.keyword + options.baseAlphabet);

		let result = "", resultCompare = "";
		let remove = options.remove.toUpperCase();

		if (options.ignoreCase)
		{
			remove = remove.toUpperCase();
		}

		for (let i = 0; i < combined.length; i++)
		{
			const originalC = combined.charAt(i);
			let c = originalC;
			if (options.ignoreCase)
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
	KeyedAlphabetGenerator,
	RandomBytesGenerator,
	NullBytesGenerator
};