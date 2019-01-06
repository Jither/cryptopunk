import { Transform, TransformError } from "../transforms";
import { xorBytes } from "../../cryptopunk.bitarith";

class CbcModeEncryptTransform extends Transform
{
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

			xorBytes(paddedBlock, iv);
			const cipherBlock = cipher.transform(paddedBlock, key);
			iv = cipherBlock;

			result.set(cipherBlock, offset);
		}

		return result;
	}
}

class CbcModeDecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("transform", "Block Cipher")
			.addInput("bytes", "Ciphertext")
			.addInput("bytes", "Key")
			.addInput("bytes", "IV")
			.addOutput("bytes", "Plaintext");
	}

	transform(cipher, ciphertext, key, iv)
	{
		const blockLength = 16;

		if (iv.length !== blockLength)
		{
			throw new TransformError(`IV size must be equal to block size.`);
		}

		const blockCount = Math.ceil(ciphertext.length / blockLength);
		const result = new Uint8Array(blockLength * blockCount);

		for (let offset = 0; offset < result.length; offset += blockLength)
		{
			const block = ciphertext.subarray(offset, offset + blockLength);
			const paddedBlock = new Uint8Array(blockLength);
			paddedBlock.set(block);

			const plainBlock = cipher.transform(paddedBlock, key);
			xorBytes(plainBlock, iv);
			iv = paddedBlock;

			result.set(plainBlock, offset);
		}

		return result;
	}
}

export {
	CbcModeEncryptTransform,
	CbcModeDecryptTransform
};