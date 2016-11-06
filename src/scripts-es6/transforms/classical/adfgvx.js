import { Transform, TransformError } from '../transforms';
import { columnarTransposition, inverseColumnarTransposition, getLetterSortPermutation } from './cryptopunk.classical-utils';
import { removeWhiteSpace } from "../../cryptopunk.utils";

// TODO: Combine common functionality

class AdfgvxEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addInput("string", "Mixed alphabet")
			.addInput("string", "Transposition Key")
			.addOutput("string", "Ciphertext")
			.addOption("headers", "Table headers", "ADFGVX");
	}

	transform(plaintext, alphabet, key, options)
	{
		options = Object.assign({}, this.defaults, options);

		const headers = options.headers.toUpperCase();
		const headersCount = headers.length;
		const maxAlphabetLength = headersCount * headersCount;

		alphabet = removeWhiteSpace(alphabet).toUpperCase();

		if (alphabet.length < 1 || alphabet.length > maxAlphabetLength)
		{
			throw new TransformError(`Alphabet must be between 1 and ${maxAlphabetLength} characters. Was: ${alphabet.length} characters.`);
		}

		if (key.length < 1)
		{
			throw new TransformError(`Key must be at least 1 letter.`)
		}

		// TODO: Ensure key doesn't have duplicate letters

		// Fractionate message (i.e. turn it into a combination of row/column headers)
		let fractionated = "";
		for (let i = 0; i < plaintext.length; i++)
		{
			const c = plaintext.charAt(i).toUpperCase();
			const index = alphabet.indexOf(c);
			const row = Math.floor(index / headersCount);
			const column = index % headersCount;

			fractionated += headers.charAt(row) + headers.charAt(column);
		}

		// Columnar transposition
		const columnOrder = getLetterSortPermutation(key);
		const transposed = columnarTransposition(fractionated, columnOrder);
		return transposed
	}
}

class AdfgvxDecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Ciphertext")
			.addInput("string", "Mixed alphabet")
			.addInput("string", "Transposition Key")
			.addOutput("string", "Plaintext")
			.addOption("headers", "Table headers", "ADFGVX");
	}

	transform(ciphertext, alphabet, key, options)
	{
		options = Object.assign({}, this.defaults, options);

		const headers = options.headers.toUpperCase();
		const headersCount = headers.length;
		const maxAlphabetLength = headersCount * headersCount;

		alphabet = removeWhiteSpace(alphabet).toUpperCase();

		if (alphabet.length < 1 || alphabet.length > maxAlphabetLength)
		{
			throw new TransformError(`Alphabet must be between 1 and ${maxAlphabetLength} characters. Was: ${alphabet.length} characters.`);
		}

		if (key.length < 1)
		{
			throw new TransformError(`Key must be at least 1 letter.`)
		}

		// TODO: Ensure key doesn't have duplicate letters
		// TODO: Ensure ciphertext has length % 2 = 0

		// Columnar transposition
		const columnOrder = getLetterSortPermutation(key);
		const transposed = inverseColumnarTransposition(ciphertext, columnOrder);

		// De-fractionate message (i.e. turn it into letters from row/column headers)
		let defractionated = "";
		for (let i = 0; i < transposed.length; i += 2)
		{
			const rowChar = transposed.charAt(i).toUpperCase();
			const colChar = transposed.charAt(i + 1).toUpperCase();
			const row = headers.indexOf(rowChar);
			const column = headers.indexOf(colChar);
			const index = row * headersCount + column;

			defractionated += alphabet.charAt(index);
		}

		return defractionated;
	}
}

export {
	AdfgvxEncryptTransform,
	AdfgvxDecryptTransform
};