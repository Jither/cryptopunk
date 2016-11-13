import { Transform, TransformError } from "../transforms";
import { restoreFormatting, hasDualCaseCharacters } from "./cryptopunk.classical-utils";

class SimpleSubstitutionTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Input")
			.addInput("string", "Output")
			.addInput("string", "Alphabet")
			.addInput("string", "Substitution alphabet")
			.addOption("formatted", "Formatted", true)
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, alphabet, substAlphabet, options)
	{
		options = Object.assign({}, this.defaults, options);

		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";
		substAlphabet = substAlphabet || "zyxwvutsrqponmlkjihgfedcba";

		if (alphabet.length !== substAlphabet.length)
		{
			throw new TransformError(`Substitution alphabet must be the same length as alphabet.`);
		}

		const original = str;

		if (options.ignoreCase)
		{
			str = str.toUpperCase();
			alphabet = alphabet.toUpperCase();
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
			result += substAlphabet.charAt(index);
		}

		if (options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, options.ignoreCase, hasDualCaseCharacters(substAlphabet));
		}

		return result;
	}
}

export {
	SimpleSubstitutionTransform
};