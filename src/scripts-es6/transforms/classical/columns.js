import { Transform } from "../transforms";
import { columnarTransposition, inverseColumnarTransposition } from "./cryptopunk.classical-utils";
import { removeWhiteSpace } from "../../cryptopunk.strings";

class ColumnarTranspositionEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addOutput("string", "Ciphertext")
			.addOption("key", "Key", "3,1,4,2,0");
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		const columnOrder = removeWhiteSpace(options.key).split(",").map(key => parseInt(key.trim(), 10));

		return columnarTransposition(str, columnOrder);
	}
}

class ColumnarTranspositionDecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addOutput("string", "Ciphertext")
			.addOption("key", "Key", "3,1,4,2,0");
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		const columnOrder = removeWhiteSpace(options.key).split(",").map(key => parseInt(key.trim(), 10));

		return inverseColumnarTransposition(str, columnOrder);
	}
}

export {
	ColumnarTranspositionEncryptTransform,
	ColumnarTranspositionDecryptTransform
};