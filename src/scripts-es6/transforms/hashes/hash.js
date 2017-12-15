import { Transform, TransformError } from "../transforms";

class HashTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Message")
			.addOutput("bytes", "Hash");
	}

	transformBlocks(bytes, blockLength, ...rest)
	{
		const blockCount = Math.floor(bytes.length / blockLength) + 1;

		for (let blockIndex = 0; blockIndex < blockCount; blockIndex++)
		{
			const offset = blockIndex * blockLength;
			let block = bytes.subarray(offset, offset + blockLength);
			if (blockIndex === blockCount - 1)
			{
				// Last block - pad it
				const paddedBlock = block = this.padBlock(block, { messageLength: bytes.length, blockLength: blockLength });
				// Padding may turn the block into two (if there is not enough
				// space for padding). In that case, we need to transform both.
				// Contract: Returned padded block length will always be a multiple
				// of the hash's block length.
				if (block.length > blockLength)
				{
					// First transform last message block
					block = paddedBlock.subarray(0, blockLength);
					this.transformBlock(block, ...rest);

					// And then the padding block
					block = paddedBlock.subarray(blockLength, blockLength * 2);
				}
			}
			this.transformBlock(block, ...rest);
		}
	}

	// Simple default padding: Simply append 1-bit.
	// Always add padding, even if message is already multiple of block length.
	padBlock(block, parameters)
	{
		const blockLength = parameters.blockLength;
		const length = block.length + 1 > blockLength ? blockLength * 2 : blockLength;
		const result = new Uint8Array(length);
		result.set(block);
		result[block.length] = 0x80;

		return result;
	}
}

class MdHashTransform extends HashTransform
{
	constructor(blockSize, endianness, suffixLength)
	{
		super();

		if (!blockSize)
		{
			throw new TransformError("No block size specified in MdHashTransform constructor");
		}
		this.blockSize = blockSize;
		this.endianness = endianness || "LE";
		this.suffixLength = suffixLength || 8;

		this.paddingStartBit = 0x80;
	}

	get blockLength()
	{
		return this.blockSize / 8;
	}

	transformBlocks(bytes, ...rest)
	{
		super.transformBlocks(bytes, this.blockLength, ...rest);
	}

	padBlock(block, parameters)
	{
		const blockLength = this.blockLength;

		const length = block.length;

		let paddingLength;
		if (!this.paddingAlwaysAddsBlock)
		{
			// MD4 and most later algorithms
			paddingLength = (blockLength - this.suffixLength) - (length % blockLength);
			if (paddingLength <= 0)
			{
				paddingLength += blockLength;
			}
		}
		else
		{
			// Snefru, JH
			paddingLength = (blockLength - this.suffixLength) + ((blockLength - length) % blockLength);
		}

		const result = new Uint8Array(length + paddingLength + this.suffixLength);

		// Copy message bytes to padded block:
		result.set(block);
		// Add "1-bit":
		result[length] = this.paddingStartBit;

		// For e.g. BLAKE
		if (this.paddingEndBit)
		{
			// We use OR here, because the end bit may actually be the same byte as
			// the start bit
			result[length + paddingLength - 1] |= this.paddingEndBit;
		}

		this.writeSuffix(result, length + paddingLength, parameters.messageLength);

		return result;
	}

	writeSuffix(block, offset, messageLength)
	{
		// NOTE: The maximum javascript array size is 2^32-1 bytes. That's also the
		// (very theoretical) maximum message length we would be able to handle.
		// That means the low word will store the low 29 bits of the byte length - shifted
		// left by 3 because we actually store *bit* length. And the high word will
		// just store the 3 bits shifted out. For 64 bit hashes, the rest of the appended
		// message length bits are way out of reach and will just be set to 0.
		let messageSizeLo = messageLength << 3;
		let messageSizeHi = messageLength >>> 29;

		if (this.endianness === "BE")
		{
			// Skip to the least significant 64 bits (the higher bits will be 0)
			offset += this.suffixLength - 8;

			for (let i = 3; i >= 0; i--)
			{
				block[offset + i] = messageSizeHi;
				block[offset + i + 4] = messageSizeLo;
				messageSizeHi >>>= 8;
				messageSizeLo >>>= 8;
			}
		}
		else
		{
			for (let i = 0; i < 4; i++)
			{
				block[offset + i] = messageSizeLo;
				block[offset + i + 4] = messageSizeHi;
				messageSizeHi >>>= 8;
				messageSizeLo >>>= 8;
			}
		}
	}
}

export {
	MdHashTransform,
	HashTransform
};