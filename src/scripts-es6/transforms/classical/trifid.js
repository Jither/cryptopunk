import { Transform, TransformError } from "../transforms";
import { polybius3, depolybius3, restoreFormatting } from "./cryptopunk.classical-utils";
import { mod, isPerfectCube } from "../../cryptopunk.math";
import { removeWhiteSpace } from "../../cryptopunk.strings";

// TODO: Untested and buggy (particularly "formatted")
class TrifidTransform extends Transform
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
			alphabet = "abcdefghijklmnopqrstuvwxyz.";
		}

		if (!isPerfectCube(alphabet.length))
		{
			throw new TransformError(`Alphabet table must be a perfect cube.`);
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

class TrifidEncryptTransform extends TrifidTransform
{
	constructor()
	{
		super(false);
	}

	_transform(str, alphabet)
	{
		let coords = polybius3(str, alphabet).filter(coord => coord !== null);

		const positions = new Array(coords.length * 3);
		for (let i = 0; i < coords.length; i++)
		{
			const coord = coords[i];
			positions[i] = coord[0];
			positions[i + coords.length] = coord[1];
			positions[i + coords.length * 2] = coord[2];
		}

		for (let i = 0; i < coords.length; i++)
		{
			const index = i * 3;
			const coord = coords[i];
			coord[0] = positions[index];
			coord[1] = positions[index + 1];
			coord[2] = positions[index + 2];
		}

		return depolybius3(coords, alphabet);
	}
}

class TrifidDecryptTransform extends TrifidTransform
{
	constructor()
	{
		super(true);
	}

	_transform(str, alphabet)
	{
		const coords = polybius3(str, alphabet).filter(coord => coord !== null);

		const positions = new Array(coords.length * 3);

		for (let i = 0; i < coords.length; i++)
		{
			const index = i * 3;
			const coord = coords[i];
			positions[index] = coord[0];
			positions[index + 1] = coord[1];
			positions[index + 2] = coord[2];
		}

		for (let i = 0; i < coords.length; i++)
		{
			const coord = coords[i];
			coord[0] = positions[i];
			coord[1] = positions[i + coords.length];
			coord[2] = positions[i + coords.length * 2];
		}

		return depolybius3(coords, alphabet);
	}
}

export {
	TrifidEncryptTransform,
	TrifidDecryptTransform
};