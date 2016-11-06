import { Transform, TransformError } from "../transforms";
import { columnarTransposition, inverseColumnarTransposition, getLetterSortPermutation, polybius, depolybius } from "./cryptopunk.classical-utils";
import { hasDuplicateCharacters, removeWhiteSpace } from "../../cryptopunk.strings";

class AdfgvxTransform extends Transform
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

	transform(message, alphabet, key, options)
	{
		options = Object.assign({}, this.defaults, options);

		const headers = options.headers.toUpperCase();
		const headersCount = headers.length;
		const maxAlphabetLength = headersCount * headersCount;

		message = removeWhiteSpace(message).toUpperCase();
		alphabet = removeWhiteSpace(alphabet).toUpperCase();

		if (alphabet.length < 1 || alphabet.length > maxAlphabetLength)
		{
			throw new TransformError(`Alphabet must be between 1 and ${maxAlphabetLength} characters. Was: ${alphabet.length} characters.`);
		}

		if (key.length < 1)
		{
			throw new TransformError(`Key must be at least 1 letter.`);
		}

		// Since we do columnar transposition by sorting the key characters, duplicate characters would cause
		// an unpredictable column order.
		if (hasDuplicateCharacters(key.toUpperCase()))
		{
			throw new TransformError(`Key with duplicate characters would not be predictably decipherable.`);
		}

		return this._transform(message, alphabet, key, headers);
	}
}

class AdfgvxEncryptTransform extends AdfgvxTransform
{
	_transform(plaintext, alphabet, key, headers)
	{
		// TODO: Handle plaintext characters not in alphabet (likely throw)

		// Fractionate message (i.e. turn it into a combination of row/column headers)
		const coords = polybius(plaintext, alphabet, headers);
		let fractionated = "";
		for (let i = 0; i < coords.length; i++)
		{
			fractionated += coords[i];
		}

		// Columnar transposition
		const columnOrder = getLetterSortPermutation(key);
		const transposed = columnarTransposition(fractionated, columnOrder);
		return transposed;
	}
}

class AdfgvxDecryptTransform extends AdfgvxTransform
{
	_transform(ciphertext, alphabet, key, headers)
	{
		if (ciphertext.length % 2 !== 0)
		{
			throw new TransformError(`Ciphertext length must be a multiple of 2. Was: ${ciphertext.length}.`);
		}

		// Columnar transposition
		const columnOrder = getLetterSortPermutation(key);
		const transposed = inverseColumnarTransposition(ciphertext, columnOrder);

		// De-fractionate message (i.e. turn it into letters from row/column headers)
		const defractionated = depolybius(transposed, alphabet, headers);

		return defractionated;
	}
}

export {
	AdfgvxEncryptTransform,
	AdfgvxDecryptTransform
};