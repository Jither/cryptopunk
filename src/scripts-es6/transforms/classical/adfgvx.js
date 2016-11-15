import { Transform, TransformError } from "../transforms";
import { columnarTransposition, inverseColumnarTransposition, getLetterSortPermutation, polybius, depolybius } from "./cryptopunk.classical-utils";
import { groupCharacters, hasDuplicateCharacters, removeWhiteSpace } from "../../cryptopunk.strings";

class AdfgvxTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.addInput("string", decrypt ? "Ciphertext" : "Plaintext")
			.addInput("string", "Transposition Key")
			.addInput("string", "Alphabet")
			.addOutput("string", decrypt ? "Plaintext" : "Ciphertext")
			.addOption("headers", "Table headers", "ADFGVX");
	}

	transform(message, key, alphabet)
	{
		const headers = this.options.headers.toUpperCase();
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
		// TODO: Use common practice instead - recurring letters are replaced by the next available succeeding letter.
		// I.e. POTATO would become POTAUQ
		if (hasDuplicateCharacters(key.toUpperCase()))
		{
			throw new TransformError(`Key with duplicate characters would not be predictably decipherable.`);
		}

		return this._transform(message, key, alphabet, headers);
	}
}

class AdfgvxEncryptTransform extends AdfgvxTransform
{
	constructor()
	{
		super(false);
		this.addOption("grouping", "Group characters", 4, { min: 0 });
	}
	_transform(plaintext, key, alphabet, headers)
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
		return groupCharacters(transposed, this.options.grouping);
	}
}

class AdfgvxDecryptTransform extends AdfgvxTransform
{
	constructor()
	{
		super(true);
	}

	_transform(ciphertext, key, alphabet, headers)
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