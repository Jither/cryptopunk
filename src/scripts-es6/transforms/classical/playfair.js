import { Transform, TransformError } from "../transforms";
import { groupCharacters, removeWhiteSpace } from "../../cryptopunk.strings";
import { mod } from "../../cryptopunk.math";

class PlayfairTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.addInput("string", decrypt ? "Ciphertext" : "Plaintext")
			.addInput("string", "Alphabet")
			.addOutput("string", decrypt ? "Plaintext" : "Ciphertext");
	}

	transform(str, alphabet)
	{
		alphabet = removeWhiteSpace(alphabet).toUpperCase();
		str = removeWhiteSpace(str);

		const alphabetLength = alphabet.length;

		const width = Math.sqrt(alphabetLength);
		if (width !== Math.floor(width))
		{
			throw new TransformError(`Alphabet length must be a square number. Was: ${alphabet.length}.`);
		}

		return this._transform(str, alphabet, width);
	}
}

class PlayfairEncryptTransform extends PlayfairTransform
{
	constructor()
	{
		super(false);
		this.addOption("padding", "Padding character", "X", { type: "char" })
			.addOption("grouping", "Group characters", 5, { min: 0 });
	}

	_transform(str, alphabet, width)
	{
		let i = 0;
		let result = "";
		const padding = this.options.padding || "X";
		while (i < str.length)
		{
			const digramA = str.charAt(i);
			let digramB = str.charAt(i + 1);

			// 1. If letters are the same, or only one was left, use padding character for second character:
			if (digramB === digramA || digramB === "")
			{
				digramB = padding; // Use X if option was set to empty string
				// Only add 1, since we didn't use the second letter.
				i++;
			}
			else
			{
				i += 2;
			}

			const indexA = alphabet.indexOf(digramA.toUpperCase());
			const indexB = alphabet.indexOf(digramB.toUpperCase());

			let rowA = Math.floor(indexA / width);
			let rowB = Math.floor(indexB / width);
			let colA = indexA % width;
			let colB = indexB % width;

			if (rowA === rowB)
			{
				// 2. If letters are in same row, substitute with letters one place right, wrapping around
				colA = (colA + 1) % width;
				colB = (colB + 1) % width;
			}
			else if (colA === colB)
			{
				// 3. If letters are in same column, substitute with letters one place down, wrapping around
				rowA = (rowA + 1) % width;
				rowB = (rowB + 1) % width;
			}
			else
			{
				// 4. If letters aren't on same row or column, substitute each letter with letter on same row as letter and same column as other letter
				// In other words, swap their columns
				[colA, colB] = [colB, colA];
			}

			const resultA = alphabet.charAt(rowA * width + colA);
			const resultB = alphabet.charAt(rowB * width + colB);

			result += resultA + resultB;
		}

		return groupCharacters(result, this.options.grouping);
	}
}

class PlayfairDecryptTransform extends PlayfairTransform
{
	constructor()
	{
		super(true);
	}

	_transform(str, alphabet, width)
	{
		let i = 0;
		let result = "";

		if (str.length % 2 !== 0)
		{
			throw new TransformError(`Ciphertext length must be a multiple of 2. Was: ${str.length}.`);
		}


		while (i < str.length)
		{
			const digramA = str.charAt(i);
			const digramB = str.charAt(i + 1);

			const indexA = alphabet.indexOf(digramA.toUpperCase());
			const indexB = alphabet.indexOf(digramB.toUpperCase());

			let rowA = Math.floor(indexA / width);
			let rowB = Math.floor(indexB / width);
			let colA = indexA % width;
			let colB = indexB % width;

			if (rowA === rowB)
			{
				// 2. If letters are in same row, substitute with letters one place right, wrapping around
				colA = mod(colA - 1, width); // using mod function here, because result of subtraction may turn negative
				colB = mod(colB - 1, width);
			}
			else if (colA === colB)
			{
				// 3. If letters are in same column, substitute with letters one place down, wrapping around
				rowA = mod(rowA - 1, width);
				rowB = mod(rowB - 1, width);
			}
			else
			{
				// 4. If letters aren't on same row or column, substitute each letter with letter on same row as letter and same column as other letter
				// In other words, swap their columns
				[colA, colB] = [colB, colA];
			}

			const resultA = alphabet.charAt(rowA * width + colA);
			const resultB = alphabet.charAt(rowB * width + colB);

			result += resultA + resultB;

			i += 2;
		}

		return result;
	}
}


export {
	PlayfairEncryptTransform,
	PlayfairDecryptTransform
};