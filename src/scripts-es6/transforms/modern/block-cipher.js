import { Transform, TransformError } from "../transforms";

class BlockCipherTransform extends Transform
{
	constructor()
	{
		super();
	}

	transformBlocks(bytes, blockSizeBits, ...rest)
	{
		const blockSizeBytes = blockSizeBits / 8;
		const blockCount = Math.ceil(bytes.length / blockSizeBytes);

		const result = new Uint8Array(blockSizeBytes * blockCount);
		const blockBuffer = new Uint8Array(blockSizeBytes);

		for (let offset = 0; offset < result.length; offset += blockSizeBytes)
		{
			let block = bytes.subarray(offset, offset + blockSizeBytes);
			if (block.length < blockSizeBytes)
			{
				// Create padded block - pure 0 padding isn't proper padding (non-reversible), but since
				// we don't know where the output might be used, we can't assume a padding scheme (for now)
				const paddedBlock = new Uint8Array(blockSizeBytes);
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