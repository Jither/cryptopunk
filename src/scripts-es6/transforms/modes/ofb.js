import { Transform, TransformError } from "../transforms";
import { xorBytes } from "../../cryptopunk.bitarith";

class OfbModeTransform extends Transform
{
	get description()
	{
		return "Note that OFB mode generally uses cipher's ENCRYPTION method for both encryption and decryption! (Encryption and decryption are identical)";
	}

	constructor()
	{
		super();
		this.addInput("transform", "Block Cipher")
			.addInput("bytes", "Plaintext")
			.addInput("bytes", "Key")
			.addInput("bytes", "IV")
			.addOutput("bytes", "Ciphertext");
	}

	transform(cipher, plaintext, key, iv)
	{
		const blockLength = 16;

		if (!cipher)
		{
			throw new TransformError(`No cipher specified.`);
		}

		if (iv.length !== blockLength)
		{
			throw new TransformError(`IV size must be equal to block size.`);
		}

		const blockCount = Math.ceil(plaintext.length / blockLength);
		const result = new Uint8Array(blockLength * blockCount);

		for (let offset = 0; offset < result.length; offset += blockLength)
		{
			const block = plaintext.subarray(offset, offset + blockLength);
			const paddedBlock = new Uint8Array(blockLength);
			paddedBlock.set(block);

			const stream = cipher.transform(iv, key);
			xorBytes(paddedBlock, stream);
			iv = stream;

			result.set(paddedBlock, offset);
		}

		return result;
	}
}

export {
	OfbModeTransform
};