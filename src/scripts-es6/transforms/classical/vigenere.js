import { Transform, TransformError } from "../transforms";
import { mod } from "../../cryptopunk.math";
import { restoreFormatting } from "./cryptopunk.classical-utils";

class VigenereTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.decrypt = decrypt;

		this.addInput("string", decrypt ? "Ciphertext" : "Plaintext")
			.addInput("string", "Alphabet")
			.addInput("string", "Key")
			.addOutput("string", decrypt ? "Plaintext" : "Ciphertext")
			.addOption("formatted", "Formatted", true)
			.addOption("ignoreCase", "Ignore case", true);
	}

	checkKey(key, alphabet)
	{
		for (let i = 0; i < key.length; i++)
		{
			const c = key.charAt(i);
			if (alphabet.indexOf(c) < 0)
			{
				throw new TransformError(`Key character '${c}' not found in alphabet`);
			}
		}
	}

	transform(str, key, alphabet, options)
	{
		options = Object.assign({}, this.defaults, options);
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";
		const alphabetLength = alphabet.length;

		if (!key)
		{
			throw new TransformError("No key specified");
		}

		const original = str;

		if (options.ignoreCase)
		{
			str = str.toUpperCase();
			alphabet = alphabet.toUpperCase();
			key = key.toUpperCase();
		}

		this.checkKey(key, alphabet);

		let result = "";

		let keyIndex = 0;
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const index = alphabet.indexOf(c);
			if (index < 0)
			{
				continue;
			}
			const keyChar = key.charAt(keyIndex++);
			const x = alphabet.indexOf(keyChar);
			if (keyIndex >= key.length)
			{
				keyIndex = 0;
			}
			const outIndex = this.decrypt ? index - x : index + x;
			result += alphabet.charAt(mod(outIndex, alphabetLength));
		}

		if (options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, options.ignoreCase);
		}

		return result;
	}
}

class VigenereEncryptTransform extends VigenereTransform
{
	constructor()
	{
		super(false);
	}
}


class VigenereDecryptTransform extends VigenereTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	VigenereEncryptTransform,
	VigenereDecryptTransform
};