import { TransformError } from "./transforms";
import { SubstitutionTransform } from "./substitution";
import { mod } from "../cryptopunk.utils";

class VigenereEncryptTransform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.decrypt = false;

		this
			.addInput("string", "Key") // Key
			.addOption("alphabet", "Alphabet", "abcdefghijklmnopqrstuvwxyz")
			.addOption("ignoreCase", "Ignore case", true);
	}

	checkKey(alphabet, key)
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

	transform(str, key, options)
	{
		options = Object.assign({}, this.defaults, options);
		const alphabet = options.alphabet;
		const alphabetLength = alphabet.length;
		const ignoreCase = options.ignoreCase;
		if (!key)
		{
			throw new TransformError("No key specified");
		}

		const keyAlphabet = ignoreCase ? alphabet.toLowerCase() : alphabet;
		key = ignoreCase ? key.toLowerCase() : key;

		this.checkKey(keyAlphabet, key);

		let result = "";

		let keyIndex = 0;
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			result += this.substitute(
				c,
				alphabet,
				ignoreCase,
				index => {
					const keyChar = key.charAt(keyIndex);
					const x = keyAlphabet.indexOf(keyChar);
					keyIndex++;
					if (keyIndex >= key.length)
					{
						keyIndex = 0;
					}
					const outIndex = this.decrypt ? index - x : index + x;
					return alphabet.charAt(mod(outIndex, alphabetLength));
				}
			);
		}
		return result;
	}
}

class VigenereDecryptTransform extends VigenereEncryptTransform
{
	constructor()
	{
		super();
		this.decrypt = true;
	}
}

export {
	VigenereEncryptTransform,
	VigenereDecryptTransform
};