import { Transform, TransformError } from "../transforms";
import { gaussJordan, multiplyVector } from "../../cryptopunk.matrix";
import { isCoPrime, isPerfectSquare } from "../../cryptopunk.math";
import { restoreFormatting, removeNonAlphabetCharacters } from "./cryptopunk.classical-utils";

class HillTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.decrypt = decrypt;
		this.addInput("string", decrypt ? "Ciphertext" : "Plaintext")
			.addInput("string", "Key")
			.addInput("string", "Alphabet")
			.addOutput("string", decrypt ? "Plaintext" : "Ciphertext")
			.addOption("paddingChar", "Padding character", "x", { type: "char" })
			.addOption("formatted", "Formatted", true);
	}

	transform(str, key, alphabet)
	{
		alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";

		const keyLength = key.length;
		if (key.length === 0)
		{
			throw new TransformError("No key specified.");
		}

		if (!isPerfectSquare(keyLength))
		{
			throw new TransformError(`Key length must be a perfect square. Was: ${keyLength}`);
		}

		if (alphabet.indexOf(this.options.paddingChar) < 0)
		{
			throw new TransformError(`Padding character must be in alphabet. Was: ${this.options.paddingChar}.`);
		}

		let originalStr = str;

		key = key.toUpperCase();
		alphabet = alphabet.toUpperCase();
		str = str.toUpperCase();
		str = removeNonAlphabetCharacters(str, alphabet);

		const matrix = this.keyToMatrix(key, alphabet);

		// We do padding here - it will save time (and code) in the actual transformation.
		// Also, we need the padding length if we want to restore formatting (see below)
		const paddingLength = (matrix.length - (str.length % matrix.length)) % matrix.length;
		let padding = "";		
		if (paddingLength > 0)
		{
			padding = this.options.paddingChar.repeat(paddingLength);
			str += padding.toUpperCase();
		}

		let result = this.transformBlocks(str, alphabet, matrix);

		if (this.options.formatted)
		{
			// Pad original string - it needs to match the result
			originalStr += padding;
			result = restoreFormatting(result, originalStr, alphabet, true);
		}
		return result;
	}

	keyToMatrix(key, alphabet)
	{
		// TODO: Cache - remember that key matrix is also dependent on alphabet.
		// Also note that we should probably store invalid keys too (they're just
		// as computation intensive).
		// TODO: In the long term, generalize key caching.
		// For now, we store the latest key
		if (this.lastKey)
		{
			if (this.lastKey.alphabet === alphabet && this.lastKey.key === key)
			{
				return this.decrypt ? this.lastKey.inverse : this.lastKey.matrix;
			}
		}
		const dim = Math.sqrt(key.length);

		// Convert string key to matrix:
		const matrix = new Array(dim);
		let keyIndex = 0;
		for (let row = 0; row < dim; row++)
		{
			const r = matrix[row] = new Array(dim);
			for (let col = 0; col < dim; col++)
			{
				const c = key.charAt(keyIndex);
				const index = alphabet.indexOf(c);
				if (c < 0)
				{
					throw new TransformError(`Key character '${c}' not found in alphabet.`);
				}
				r[col] = index;
				keyIndex++;
			}
		}

		// Get inverse matrix and determinant:
		const alphabetLength = alphabet.length;
		const matrixInfo = gaussJordan(matrix, alphabetLength);

		if (matrixInfo.inverse === null)
		{
			throw new TransformError("Key matrix must be invertible (this one isn't).");
		}

		if (!isCoPrime(matrixInfo.determinant, alphabetLength))
		{
			throw new TransformError(`Key matrix determinant (${matrixInfo.determinant}) must be co-prime with alphabet length (${alphabetLength}).`);
		}

		this.lastKey = {
			alphabet: alphabet,
			key: key,
			matrix: matrix,
			inverse: matrixInfo.inverse
		};

		return this.decrypt ? matrixInfo.inverse : matrix;
	}

	transformBlocks(str, alphabet, matrix)
	{
		const matrixDim = matrix.length;
		const blockVector = new Array(matrixDim);

		let i = 0;
		let result = "";

		// Process string in blocks of [matrix dimension] characters
		for (let i = 0; i < str.length; i += matrixDim)
		{
			// convert block to vector:
			const block = str.substr(i, matrixDim);
			for (let j = 0; j < matrixDim; j++)
			{
				const c = block.charAt(j);
				const index = alphabet.indexOf(c);
				blockVector[j] = index;
			}

			// Multiply block vector by matrix key:
			const outputVector = multiplyVector(matrix, blockVector);

			// Convert back to characters:
			for (let j = 0; j < matrixDim; j++)
			{
				const c = alphabet.charAt(outputVector[j] % alphabet.length);
				result += c;
			}
		}

		return result;
	}
}

class HillEncryptTransform extends HillTransform
{
	constructor()
	{
		super(false);
	}
}

class HillDecryptTransform extends HillTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	HillEncryptTransform,
	HillDecryptTransform
};