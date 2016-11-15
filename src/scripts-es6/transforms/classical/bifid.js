import { Transform, TransformError } from "../transforms";
import { polybius, depolybius, restoreFormatting } from "./cryptopunk.classical-utils";
import { mod, isPerfectSquare } from "../../cryptopunk.math";
import { removeWhiteSpace } from "../../cryptopunk.strings";

class BifidTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.addInput("string", decrypt ? "Ciphertext" : "Plaintext")
			.addInput("string", "Alphabet")
			.addOutput("string", decrypt ? "Plaintext" : "Ciphertext")
			.addOption("formatted", "Formatted", true)
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, alphabet)
	{
		alphabet = removeWhiteSpace(alphabet);

		if (alphabet.length < 1)
		{
			alphabet = "abcdefghiklmnopqrstuvwxyz";
		}

		if (!isPerfectSquare(alphabet.length))
		{
			throw new TransformError(`Alphabet table must be a perfect square.`);
		}

		const originalStr = str;
		if (this.options.ignoreCase)
		{
			alphabet = alphabet.toUpperCase();
			str = str.toUpperCase();
		}

		let result = this._transform(str, alphabet);
		if (this.options.formatted)
		{
			result = restoreFormatting(result, originalStr, alphabet, this.options.ignoreCase);
		}
		return result;
	}
}

class BifidEncryptTransform extends BifidTransform
{
	constructor()
	{
		super(false);
	}

	_transform(str, alphabet)
	{
		let coords = polybius(str, alphabet).filter(coord => coord !== null);

		const positions = new Array(coords.length * 2);
		for (let i = 0; i < coords.length; i++)
		{
			const coord = coords[i];
			positions[i] = coord[0];
			positions[i + coords.length] = coord[1];
		}

		for (let i = 0; i < coords.length; i++)
		{
			const coord = coords[i];
			const index = i * 2;
			coord[0] = positions[index];
			coord[1] = positions[index + 1];
		}

		return depolybius(coords, alphabet);
	}
}

class BifidDecryptTransform extends BifidTransform
{
	constructor()
	{
		super(true);
	}

	_transform(str, alphabet)
	{
		const coords = polybius(str, alphabet).filter(coord => coord !== null);

		const positions = new Array(coords.length * 2);

		for (let i = 0; i < coords.length; i++)
		{
			const coord = coords[i];
			const index = i * 2;
			positions[index] = coord[0];
			positions[index + 1] = coord[1];
		}

		for (let i = 0; i < coords.length; i++)
		{
			const coord = coords[i];
			coord[0] = positions[i];
			coord[1] = positions[i + coords.length];
		}

		return depolybius(coords, alphabet);
	}
}

export {
	BifidEncryptTransform,
	BifidDecryptTransform
};