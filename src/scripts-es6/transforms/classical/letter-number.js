import { Transform, TransformError } from "../transforms";

const RX_DIGITS = /\d+/g;

class LetterNumberEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Letters")
			.addInput("alphabet", "Alphabet")
			.addOutput("string", "Numbers")
			.addOption("start", "Start from", 1)
			.addOption("separator", "Separator", "-", { type: "short-string" })
			.addOption("leadingZero", "Leading zero", false);
	}

	transform(str, alphabet)
	{
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";

		const original = str;

		str = str.toUpperCase();
		alphabet = alphabet.toUpperCase();

		let result = [];
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const index = alphabet.indexOf(c);
			if (index < 0)
			{
				continue;
			}
			let number = (index + this.options.start).toString();
			if (this.options.leadingZero)
			{
				number = ("0" + number).substr(-2);
			}
			result.push(number);
		}

		return result.join(this.options.separator);
	}
}

class LetterNumberDecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Numbers")
			.addInput("alphabet", "Alphabet")
			.addOutput("string", "Letters")
			.addOption("start", "Start from", 1);
	}

	transform(str, alphabet)
	{
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";

		let result = "";
		let match;
		while (match = RX_DIGITS.exec(str))
		{
			const index = parseInt(match[0], 10) - this.options.start;
			if (index >= 0 && index < alphabet.length)
			{
				result += alphabet.charAt(index);
			}
		}

		return result;
	}
}

export {
	LetterNumberEncryptTransform,
	LetterNumberDecryptTransform
};