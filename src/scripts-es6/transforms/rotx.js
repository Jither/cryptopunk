import { SubstitutionTransform } from "./substitution";
import { mod } from "../cryptopunk.utils";

class RotXTransform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.addOption("x", "X", 13)
			.addOption("alphabet", "Alphabet", "abcdefghijklmnopqrstuvwxyz")
			.addOption("ignoreCase", "Ignore case", true)
			.addOption("decrypt", "Decrypt", false);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		const alphabet = options.alphabet;
		const alphabetLength = alphabet.length;
		const ignoreCase = options.ignoreCase;
		let x = options.x;

		if (options.decrypt)
		{
			x = -x;
		}

		let result = "";

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			result += this.substitute(
				c,
				alphabet,
				ignoreCase,
				index => alphabet.charAt(mod(index + x, alphabetLength))
			);
		}
		return result;
	}
}

// Special premade defaults for ROT5
class Rot5Transform extends RotXTransform
{
	constructor()
	{
		super();
		this.setDefault("x", 5)
			.setDefault("alphabet", "0123456789")
			.setDefault("ignoreCase", true);
	}
}

// "ROT-18" uses separate alphabet and shift for numbers and letters respectively
class Rot18Transform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.addOption("xAlpha", "X Alpha", 13)
			.addOption("xNum", "X Numeric", 5)
			.addOption("alphabetAlpha", "Alpha", "abcdefghijklmnopqrstuvwxyz")
			.addOption("alphabetNum", "Numeric", "0123456789")
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		const ignoreCase = options.ignoreCase;
		const xAlpha = options.xAlpha;
		const xNum = options.xNum;
		const alphabetAlpha = options.alphabetAlpha;
		const alphabetNum = options.alphabetNum;

		let result = "";

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const isNumeric = alphabetNum.indexOf(c) >= 0;
			const x = isNumeric ? xNum : xAlpha;
			const alphabet = isNumeric ? alphabetNum : alphabetAlpha;
			result += this.substitute(
				c,
				alphabet,
				ignoreCase,
				index => alphabet.charAt((index + x) % alphabet.length)
			);
		}
		return result;
	}
}

// Special premade defaults for ROT47
class Rot47Transform extends RotXTransform
{
	constructor()
	{
		super();
		this.setDefault("x", 47)
			.setDefault("alphabet", "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~")
			.setDefault("ignoreCase", false);
	}
}

export {
	RotXTransform,
	Rot5Transform,
	Rot18Transform,
	Rot47Transform
};