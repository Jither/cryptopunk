import { Transform } from "../transforms";
import { mod } from "../../cryptopunk.math";
import { restoreFormatting, hasDualCaseCharacters } from "./cryptopunk.classical-utils";

class RotXBaseTransform extends Transform
{
	// The decrypt parameter is optional for base classes - it's only needed for non-symmetrical ROT variations
	constructor(decrypt)
	{
		super();
		this.decrypt = decrypt;

		this.addInput("string", "Input")
			.addOutput("string", "Output");
	}

	transform(str, alphabet)
	{
		const alphabetLength = alphabet.length;

		let x = this.options.x;
		if (this.decrypt)
		{
			x = -x;
		}

		const original = str;

		if (this.options.ignoreCase)
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

		if (this.options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, this.options.ignoreCase, hasDualCaseCharacters(alphabet));
		}

		return result;
	}
}

class RotXTransform extends RotXBaseTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addInput("string", "Alphabet")
			.addOption("x", "X", 13)
			.addOption("ignoreCase", "Ignore case", true)
			.addOption("formatted", "Formatted", true);
	}

	transform(str, alphabet)
	{
		return super.transform(str, alphabet || "abcdefghijklmnopqrstuvwxyz");
	}
}

class RotXEncryptTransform extends RotXTransform
{
	constructor()
	{
		super(false);
	}
}

class RotXDecryptTransform extends RotXTransform
{
	constructor()
	{
		super(true);
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

	transform(str)
	{
		this.setOptions({
			x: 5,
			ignoreCase: false
		});
		return super.transform(str, "0123456789");
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

	transform(str)
	{
		this.setOptions({
			x: 13,
			ignoreCase: true
		});
		return super.transform(str, "abcdefghijklmnopqrstuvwxyz");
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

	transform(str, alphabetAlpha, alphabetNum)
	{
		const xAlpha = this.options.xAlpha;
		const xNum = this.options.xNum;
		alphabetAlpha = alphabetAlpha || "abcdefghijklmnopqrstuvwxyz";
		alphabetNum = alphabetNum || "0123456789";

		const original = str;

		if (this.options.ignoreCase)
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

		if (this.options.formatted)
		{
			result = restoreFormatting(result, original, alphabetAlpha + alphabetNum, this.options.ignoreCase);
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

	transform(str)
	{
		this.setOptions({
			x: 47,
			ignoreCase: false
		});
		return super.transform(str, "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
	}
}

export {
	RotXEncryptTransform,
	RotXDecryptTransform,
	Rot5Transform,
	Rot13Transform,
	Rot18Transform,
	Rot47Transform
};