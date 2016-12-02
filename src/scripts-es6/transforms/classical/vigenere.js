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
			.addOption("autokey", "Autokey", false)
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

	transform(str, key, alphabet)
	{
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";
		const alphabetLength = alphabet.length;

		if (!key)
		{
			throw new TransformError("No key specified");
		}

		const original = str;

		if (this.options.ignoreCase)
		{
			str = str.toUpperCase();
			alphabet = alphabet.toUpperCase();
			key = key.toUpperCase();
		}

		this.checkKey(key, alphabet);

		let result = "";

		let keyIndex = 0;
		let autokeying = false;

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const index = alphabet.indexOf(c);
			// Skip any characters not in alphabet entirely (they may be reinstated by restoreFormatting)
			if (index < 0)
			{
				continue;
			}

			// If no more key characters, start over - or start using plaintext as key
			if (!autokeying && keyIndex >= key.length)
			{
				if (this.options.autokey)
				{
					autokeying = true;
				}
				keyIndex = 0;
			}

			let keyChar;
			if (autokeying)
			{
				do
				{
					keyChar = this.decrypt ? result.charAt(keyIndex++) : str.charAt(keyIndex++);
				}
				// Only use autokey characters actually in alphabet (plaintext may include
				// non-alphabetic characters which are skipped above when it's used *as* plaintext,
				// but not when it's used as key):
				while (alphabet.indexOf(keyChar) < 0);
			}
			else
			{
				keyChar = key.charAt(keyIndex++);
			}

			const x = alphabet.indexOf(keyChar);
			const outIndex = this.decrypt ? index - x : index + x;
			result += alphabet.charAt(mod(outIndex, alphabetLength));
		}

		if (this.options.formatted)
		{
			result = restoreFormatting(result, original, alphabet, this.options.ignoreCase);
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