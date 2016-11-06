import { Transform, TransformError } from "../transforms";
import { polybius, depolybius } from "./cryptopunk.classical-utils";
import { removeWhiteSpace, splitLength } from "../../cryptopunk.strings";

class PolybiusTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addInput("string", "Alphabet")
			.addOutput("string", "Ciphertext")
			.addOption("removeWhiteSpace", "Remove whitespace", true)
			.addOption("caseSensitive", "Case sensitive", false);
	}

	transform(message, alphabet, options)
	{
		options = Object.assign({}, this.defaults, options);

		if (options.removeWhiteSpace)
		{
			message = removeWhiteSpace(message);
			alphabet = removeWhiteSpace(alphabet);
		}

		if (alphabet.length < 1)
		{
			alphabet = "abcdefghjklmnopqrstuvwxyz";
		}

		if (!options.caseSensitive)
		{
			message = message.toUpperCase();
			alphabet = alphabet.toUpperCase();
		}

		return this._transform(message, alphabet, options);
	}
}

class PolybiusEncryptTransform extends PolybiusTransform
{
	constructor()
	{
		super();
		this.addOption("separator", "Separator", " ", { type: "short-string" });
	}

	_transform(plaintext, alphabet, options)
	{
		// TODO: Handle plaintext characters not in alphabet (likely throw)

		let result = "";
		const coords = polybius(plaintext, alphabet);
		for (let i = 0; i < coords.length; i++)
		{
			if (i > 0)
			{
				result += options.separator;
			}
			// Polybius indices are 1-based
			result += (coords[i][0] + 1) + "" + (coords[i][1] + 1);
		}

		return result;
	}
}

class PolybiusDecryptTransform extends PolybiusTransform
{
	_transform(ciphertext, alphabet, options)
	{
		// Skip everything that isn't numeric digits:
		let strCoords = "";
		for (let i = 0; i < ciphertext.length; i++)
		{
			const c = ciphertext.charAt(i);
			if (/[1-9]/.test(c))
			{
				strCoords += c;
			}
		}

		if (strCoords.length % 2 !== 0)
		{
			throw new TransformError(`Number of digits in ciphertext must be a multiple of two. Was: ${strCoords.length}.`);
		}

		// Convert pair of numeric digits to array [row, column] - 1-based:
		const coords = splitLength(strCoords, 2).map(coord => [
			parseInt(coord.charAt(0), 10) - 1, 
			parseInt(coord.charAt(1), 10) - 1
		]);

		return depolybius(coords, alphabet);
	}
}

export {
	PolybiusEncryptTransform,
	PolybiusDecryptTransform
};