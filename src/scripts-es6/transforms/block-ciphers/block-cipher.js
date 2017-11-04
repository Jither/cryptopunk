import { Transform, TransformError } from "../transforms";
import { checkSize } from "../../cryptopunk.utils";

class BlockCipherTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.decrypt = decrypt;
		this.addInput("bytes", decrypt ? "Ciphertext" : "Plaintext")
			.addInput("bytes", "Key")
			.addOutput("bytes", decrypt ? "Plaintext" : "Ciphertext");
	}

	checkBytesSize(name, bytes, requiredSize)
	{
		const size = bytes.length * 8;
		const requirement = checkSize(size, requiredSize);
		if (requirement)
		{
			throw new TransformError(`${name} size must be ${requirement} bits. Was: ${size} bits.`);
		}
		return size;
	}

	transformBlocks(bytes, blockSize, ...rest)
	{
		const blockLength = blockSize / 8;

		if (this.decrypt)
		{
			if (bytes.length % blockLength !== 0)
			{
				throw new TransformError(`For decryption, message size must be a multiple of the block size (${blockSize} bits/${blockLength} bytes). Was: ${bytes.length} bytes.`);
			}
		}

		const blockCount = Math.ceil(bytes.length / blockLength);

		const result = new Uint8Array(blockLength * blockCount);

		for (let offset = 0; offset < result.length; offset += blockLength)
		{
			let block = bytes.subarray(offset, offset + blockLength);
			if (block.length < blockLength)
			{
				// Create padded block - pure 0 padding isn't proper padding (non-reversible), but since
				// we don't know where the output might be used, we can't assume a padding scheme (for now)
				const paddedBlock = new Uint8Array(blockLength);
				paddedBlock.set(block);
				block = paddedBlock;
			}
			// Contract: transformBlock should not modify block (it may modify the original "bytes" input!)
			this.transformBlock(block, result, offset, ...rest);
		}

		return result;
	}
}

export {
	BlockCipherTransform
};