import { Transform, TransformError } from "../transforms";
import { restoreFormatting, hasDualCaseCharacters } from "./cryptopunk.classical-utils";
import { multiByteStringReverse } from "../../cryptopunk.strings";

class SimpleSubstitutionTransform extends Transform
{
	get description()
	{
		return "Simple substitution cipher, mapping one alphabet to another.\n\nBy default, the source alphabet is the standard English alphabet. The substitution alphabet is Atbash (reversed alphabet) by default - also for custom source alphabets.";
	}

	constructor()
	{
		super();
		this.addInput("string", "Input")
			.addInput("string", "Alphabet")
			.addInput("string", "Substitution alphabet")
			.addOutput("string", "Output")
			.addOption("formatted", "Formatted", true)
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, alphabet, substAlphabet)
	{
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";
		substAlphabet = substAlphabet || multiByteStringReverse(alphabet);

		if (alphabet.length !== substAlphabet.length)
		{
			throw new TransformError(`Substitution alphabet must be the same length as alphabet.`);
		}

		const original = str;

		if (this.options.ignoreCase)
		{
			str = str.toUpperCase();
			alphabet = alphabet.toUpperCase();
		}

		let result = "";
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const index = alphabet.indexOf(c);
			// Skip any characters not in alphabet entirely (they may be reinstated by restoreFormatting)
			if (index < 0)
			{
				continue;
			}
			result += substAlphabet.charAt(index);
		}

		if (this.options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, this.options.ignoreCase, hasDualCaseCharacters(substAlphabet));
		}

		return result;
	}
}

export {
	SimpleSubstitutionTransform
};