import { Transform, TransformError } from "../transforms";
import { gaussJordan, matrixToString, multiplyVector } from "../../cryptopunk.matrix";
import { isCoPrime, isPerfectSquare } from "../../cryptopunk.math";
import { restoreFormatting } from "./cryptopunk.classical-utils";

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

		const matrix = this.keyToMatrix(key, alphabet);

		str = this.removeNonAlphabet(str, alphabet);

		const paddingLength = (matrix.length - (str.length % matrix.length)) % matrix.length;
		if (paddingLength > 0)
		{
			const padding = this.options.paddingChar.toUpperCase().repeat(paddingLength);
			str += padding;
			originalStr += padding;
		}

		let result = this.transformBlocks(str, alphabet, matrix);

		if (this.options.formatted)
		{
			result = restoreFormatting(result, originalStr, alphabet, true);
		}
		return result;
	}

	removeNonAlphabet(str, alphabet)
	{
		let result = "";
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			if (alphabet.indexOf(c) < 0)
			{
				continue;
			}
			result += c;
		}
		return result;
	}

	keyToMatrix(key, alphabet)
	{
		const dim = Math.sqrt(key.length);

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

		return this.decrypt ? matrixInfo.inverse : matrix;
	}

	transformBlocks(str, alphabet, matrix)
	{
		const matrixDim = matrix.length;
		const blockVector = new Array(matrixDim);

		let i = 0;
		let result = "";

		for (let i = 0; i < str.length; i += matrixDim)
		{
			const block = str.substr(i, matrixDim);
			for (let j = 0; j < matrixDim; j++)
			{
				const c = block.charAt(j);
				const index = alphabet.indexOf(c);
				blockVector[j] = index;
			}

			const outputVector = multiplyVector(matrix, blockVector);

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