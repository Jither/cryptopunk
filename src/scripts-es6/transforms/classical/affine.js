import { TransformError } from "../transforms";
import { SubstitutionTransform } from "./substitution";
import { coprime, mod } from "../../cryptopunk.utils";

class AffineEncryptTransform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.addOption("a", "a", 5)
			.addOption("b", "b", 7)
			.addOption("alphabet", "Alphabet", "abcdefghijklmnopqrstuvwxyz")
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		const alphabet = options.alphabet;
		const alphabetLength = alphabet.length;
		const ignoreCase = options.ignoreCase;
		const a = options.a;
		const b = options.b;

		// a must be coprime with alphabetLength (m) in order for the message to be decryptable
		if (!coprime(a, alphabetLength))
		{
			throw new TransformError(`a (${a}) must be coprime with alphabet length (${alphabetLength}) for message to be decryptable`);
		}

		let result = "";

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			result += this.substitute(
				c,
				alphabet,
				ignoreCase,
				index => alphabet.charAt(mod(a * index + b, alphabetLength))
			);
		}
		return result;
	}
}

class AffineDecryptTransform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.addOption("a", "a", 5)
			.addOption("b", "b", 7)
			.addOption("alphabet", "Alphabet", "abcdefghijklmnopqrstuvwxyz")
			.addOption("ignoreCase", "Ignore case", true);
	}

	findInverse(a, m)
	{
		for (let x = 0; x < m; x++)
		{
			if ((a * x) % m === 1)
			{
				return x;
			}
		}
		return null;
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		const alphabet = options.alphabet;
		const alphabetLength = alphabet.length;
		const ignoreCase = options.ignoreCase;
		const a = options.a;
		const b = options.b;

		const x = this.findInverse(a, alphabetLength);
		if (x === null)
		{
			throw new TransformError(`Could not find multiplicative inverse for a = ${a}, m = ${alphabetLength}.`);
		}

		let result = "";

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			result += this.substitute(
				c,
				alphabet,
				ignoreCase,
				index => alphabet.charAt(mod(x * (index - b), alphabetLength))
			);
		}
		return result;
	}
}

export {
	AffineEncryptTransform,
	AffineDecryptTransform
};