import { Transform, TransformError } from "./transforms";

class SubstitutionTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "String")
			.addOutput("string", "String");
	}

	substitute(chr, alphabet, ignoreCase, substitution)
	{
		let searchChr = chr;
		if (ignoreCase)
		{
			// Convert both search character and alphabet to lower case for case insensitive comparison
			// Not exactly optimal to do it here, but saves a lot of code duplication for now
			searchChr = searchChr.toLowerCase();
			alphabet = alphabet.toLowerCase();
		}

		const index = alphabet.indexOf(searchChr);
		const replace = index >= 0 ? substitution(index) : chr;

		if (ignoreCase)
		{
			// Keep case of original character
			const wasLowerCase = searchChr === chr;
			return wasLowerCase ? replace.toLowerCase() : replace.toUpperCase();
		}
		return replace;
	}
}

class SimpleSubstitutionTransform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.addOption("alphabet", "Alphabet", "abcdefghijklmnopqrstuvwxyz")
			.addOption("substitutionAlphabet", "Subst", "zyxwvutsrqponmlkjihgfedcba")
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		let result = "";
		const alphabet = options.alphabet;
		const substAlphabet = options.substitutionAlphabet;

		if (alphabet.length !== substAlphabet.length)
		{
			throw new TransformError(`Substitution alphabet must be the same length as alphabet.`);
		}

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			result += this.substitute(
				c,
				alphabet,
				options.ignoreCase,
				index => substAlphabet.charAt(index)
			);
		}
		return result;
	}
}

export {
	SubstitutionTransform,
	SimpleSubstitutionTransform
};