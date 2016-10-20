import { Transform, TransformError } from "../transforms";
import { coprime, mod } from "../../cryptopunk.utils";

class SkipEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addOutput("string", "Ciphertext")
			.addOption("start", "Start offset", 0)
			.addOption("skip", "Skip", 1);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		const skip = options.skip;
		const strLength = str.length;

		if (!coprime(skip, strLength))
		{
			throw new TransformError(`Skip (${skip}) should be co-prime with message length (${strLength}) in order to encrypt the full message.`);
		}

		let index = options.start;
		let count = 0;
		const result = [];
		while (count < strLength)
		{
			index = mod(index, strLength);
			result[index] = str.charAt(count);
			count++;
			index += skip;
		}

		return result.join("");
	}
}

class SkipDecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Ciphertext")
			.addOutput("string", "Plaintext")
			.addOption("start", "Start offset", 0)
			.addOption("skip", "Skip", 1);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		const skip = options.skip;
		const strLength = str.length;

		if (!coprime(skip, strLength))
		{
			throw new TransformError(`Skip (${skip}) should be co-prime with message length (${strLength}) in order to decrypt the full message.`);
		}

		let index = options.start;
		let count = 0;
		let result = "";
		while (count < strLength)
		{
			index = mod(index, strLength);
			result += str.charAt(index);
			count++;
			index += skip;
		}

		return result;
	}
}

export {
	SkipDecryptTransform,
	SkipEncryptTransform
};