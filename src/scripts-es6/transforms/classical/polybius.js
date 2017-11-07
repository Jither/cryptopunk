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
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(message, alphabet)
	{
		if (this.options.removeWhiteSpace)
		{
			message = removeWhiteSpace(message);
			alphabet = removeWhiteSpace(alphabet);
		}

		if (alphabet.length < 1)
		{
			alphabet = "abcdefghjklmnopqrstuvwxyz";
		}

		if (this.options.ignoreCase)
		{
			message = message.toUpperCase();
			alphabet = alphabet.toUpperCase();
		}

		return this._transform(message, alphabet);
	}
}

class PolybiusEncryptTransform extends PolybiusTransform
{
	constructor()
	{
		super();
		this.addOption("separator", "Separator", " ", { type: "short-string" })
			.addOption("skipUnknown", "Skip non-alphabet characters", true);
	}

	_transform(plaintext, alphabet)
	{
		// TODO: Handle plaintext characters not in alphabet (likely throw)
		const separator = this.options.separator;

		let result = "";
		const coords = polybius(plaintext, alphabet);
		for (let i = 0; i < coords.length; i++)
		{
			const coord = coords[i];
			if (coord === null)
			{
				if (this.options.skipUnknown)
				{
					continue;
				}
				throw new TransformError(`Non-alphabet character(s) found.`);
			}
			
			if (i > 0)
			{
				result += separator;
			}
			// Polybius indices are 1-based
			result += String(coord[0] + 1) + (coord[1] + 1);
		}

		return result;
	}
}

class PolybiusDecryptTransform extends PolybiusTransform
{
	_transform(ciphertext, alphabet)
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