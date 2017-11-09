import { Transform } from "../transforms";
import { mod } from "../../cryptopunk.math";

class CondiTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.addInput("string", decrypt ? "Ciphertext" : "Plaintext")
			.addInput("string", "Alphabet")
			.addOutput("string", decrypt ? "Plaintext" : "Ciphertext")
			.addOption("ignoreCase", "Ignore case", true)
			.addOption("startShift", "Start shift", 0);

		this.decrypt = decrypt;
	}

	transform(str, alphabet)
	{
		let shift = this.options.startShift;

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
			if (index < 0)
			{
				result += original.charAt(i);
				continue;
			}
			const shiftedIndex = mod(this.decrypt ? index - shift : index + shift, alphabet.length);
			shift = (this.decrypt ? shiftedIndex : index) + 1; // CONDI actually uses 1-based alphabet indices

			result += alphabet.charAt(shiftedIndex);
		}

		return result;
	}
}

class CondiEncryptTransform extends CondiTransform
{
	constructor()
	{
		super(false);
	}
}

class CondiDecryptTransform extends CondiTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	CondiEncryptTransform,
	CondiDecryptTransform
};