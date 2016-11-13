import { Transform } from "../transforms";
import { mod } from "../../cryptopunk.math";
import { restoreFormatting, hasDualCaseCharacters } from "./cryptopunk.classical-utils";

class RotXBaseTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Input")
			.addOutput("string", "Output");
	}

	transform(str, alphabet, options)
	{
		const alphabetLength = alphabet.length;

		let x = options.x;
		if (options.decrypt)
		{
			x = -x;
		}

		const original = str;

		if (options.ignoreCase)
		{
			alphabet = alphabet.toUpperCase();
			str = str.toUpperCase();
		}

		let result = "";

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const index = alphabet.indexOf(c);
			if (index < 0)
			{
				continue;
			}
			result += alphabet.charAt(mod(index + x, alphabetLength));
		}

		if (options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, options.ignoreCase, hasDualCaseCharacters(alphabet));
		}

		return result;
	}
}

class RotXTransform extends RotXBaseTransform
{
	constructor()
	{
		super();
		this.addInput("string", "Alphabet")
			.addOption("x", "X", 13)
			.addOption("ignoreCase", "Ignore case", true)
			.addOption("formatted", "Formatted", true)
			.addOption("decrypt", "Decrypt", false);
	}

	transform(str, alphabet, options)
	{
		options = Object.assign({}, this.defaults, options);
		return super.transform(str, alphabet || "abcdefghijklmnopqrstuvwxyz", options);
	}
}

// Special premade defaults for ROT5
class Rot5Transform extends RotXBaseTransform
{
	constructor()
	{
		super();
		this.addOption("formatted", "Formatted", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		options.x = 5;
		options.ignoreCase = false;
		return super.transform(str, "0123456789", options);
	}
}

// Special premade defaults for ROT13
class Rot13Transform extends RotXBaseTransform
{
	constructor()
	{
		super();
		this.addOption("formatted", "Formatted", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		options.x = 13;
		options.ignoreCase = true;
		return super.transform(str, "abcdefghijklmnopqrstuvwxyz", options);
	}
}

// "ROT-18" uses separate alphabet and shift for numbers and letters respectively
class Rot18Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Input")
			.addInput("string", "Alphabet")
			.addInput("string", "Numeric alphabet")
			.addOutput("string", "Output")
			.addOption("xAlpha", "X Alpha", 13)
			.addOption("xNum", "X Numeric", 5)
			.addOption("formatted", "Formatted", true)
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, alphabetAlpha, alphabetNum, options)
	{
		options = Object.assign({}, this.defaults, options);
		const xAlpha = options.xAlpha;
		const xNum = options.xNum;
		alphabetAlpha = alphabetAlpha || "abcdefghijklmnopqrstuvwxyz";
		alphabetNum = alphabetNum || "0123456789";

		const original = str;

		if (options.ignoreCase)
		{
			str = str.toUpperCase();
			alphabetAlpha = alphabetAlpha.toUpperCase();
			// You never know what it might be used for, so uppercase the numeric alphabet too:
			alphabetNum = alphabetNum.toUpperCase();
		}

		let result = "";
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const isNumeric = alphabetNum.indexOf(c) >= 0;
			const alphabet = isNumeric ? alphabetNum : alphabetAlpha;

			const index = alphabet.indexOf(c);
			if (index < 0)
			{
				continue;
			}
			const x = isNumeric ? xNum : xAlpha;
			result += alphabet.charAt(mod(index + x, alphabet.length));
		}

		if (options.formatted)
		{
			result = restoreFormatting(result, original, alphabetAlpha + alphabetNum, options.ignoreCase);
		}

		return result;
	}
}

// Special premade defaults for ROT47
class Rot47Transform extends RotXBaseTransform
{
	constructor()
	{
		super();
		this.addOption("formatted", "Formatted", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		options.x = 47;
		options.ignoreCase = false;
		return super.transform(str, "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~", options);
	}
}

export {
	RotXTransform,
	Rot5Transform,
	Rot13Transform,
	Rot18Transform,
	Rot47Transform
};