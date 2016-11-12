import { Transform, TransformError } from "../transforms";
import { coprime, mod } from "../../cryptopunk.math";
import { restoreFormatting } from "./cryptopunk.classical-utils";

class AffineEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addInput("string", "Alphabet")
			.addOutput("string", "Ciphertext")
			.addOption("a", "a", 5)
			.addOption("b", "b", 7)
			.addOption("formatted", "Formatted", true)
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, alphabet, options)
	{
		options = Object.assign({}, this.defaults, options);
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";
		const alphabetLength = alphabet.length;
		const a = options.a;
		const b = options.b;

		// a must be coprime with alphabetLength (m) in order for the message to be decryptable
		if (!coprime(a, alphabetLength))
		{
			throw new TransformError(`a (${a}) must be coprime with alphabet length (${alphabetLength}) for message to be decryptable`);
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

			result += alphabet.charAt(mod(a * index + b, alphabetLength));
		}

		if (options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, options.ignoreCase);
		}
		return result;
	}
}

class AffineDecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Ciphertext")
			.addInput("string", "Alphabet")
			.addOutput("string", "Plaintext")
			.addOption("a", "a", 5)
			.addOption("b", "b", 7)
			.addOption("formatted", "Formatted", true)
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

	transform(str, alphabet, options)
	{
		options = Object.assign({}, this.defaults, options);
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";
		const alphabetLength = alphabet.length;
		const a = options.a;
		const b = options.b;

		const x = this.findInverse(a, alphabetLength);
		if (x === null)
		{
			throw new TransformError(`Could not find multiplicative inverse for a = ${a}, m = ${alphabetLength}.`);
		}

		let original = str;

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

			result += alphabet.charAt(mod(x * (index - b), alphabetLength));
		}

		if (options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, options.ignoreCase);
		}
		return result;
	}
}

export {
	AffineEncryptTransform,
	AffineDecryptTransform
};