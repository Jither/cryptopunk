import { Transform } from "../transforms";
import { int32ToBytesLE } from "../../cryptopunk.utils";

const CONSTANTS = {
	SQRT2_DIV4:  0x5a827999, // 2^^30 * SQRT(2)
	SQRT3_DIV4:  0x6ed9eba1, // 2^^30 * SQRT(3)
	SQRT5_DIV4:  0x8f1bbcdc, // 2^^30 * SQRT(5)
	SQRT7_DIV4:  0xa953fd4e, // 2^^30 * SQRT(7)
	SQRT10_DIV4: 0xca62c1d6, // 2^^30 * SQRT(10)

	CBRT2_DIV4:  0x50a28be6, // 2^^30 * CBRT(2)
	CBRT3_DIV4:  0x5c4dd124, // 2^^30 * CBRT(3)
	CBRT5_DIV4:  0x6d703ef3, // 2^^30 * CBRT(5)
	CBRT7_DIV4:  0x7a6d76e9, // 2^^30 * CBRT(7)

	INIT_1_67 :  0x67452301, // Little Endian 01234567
	INIT_2_EF :  0xefcdab89, // Little Endian 89abcdef
	INIT_3_98 :  0x98badcfe, // Little Endian fedcba98
	INIT_4_10 :  0x10325476, // Little Endian 76543210
	INIT_5_C3 :  0xc3d2e1f0, // cdef 3210 interleaved

	INIT_1_76 :  0x76543210, // Big Endian version of INIT_4
	INIT_2_FE :  0xfedcba98, // Big Endian version of INIT_3
	INIT_3_89 :  0x89abcdef, // Big Endian version of INIT_2
	INIT_4_01 :  0x01234567, // Big Endian version of INIT_1
	INIT_5_3C :  0x3c2d1e0f  // Nibbles switched version of INIT_5
};

class HashTransform extends Transform
{
	constructor(blockSize)
	{
		super();

		if (!blockSize)
		{
			throw new TransformError("No block size specified in HashTransform constructor");
		}
		this.padBlock = this.padBlockMerkle;
		this.paddingStartBit = 0x80;
		this.blockSize = blockSize;
		this.endianness = "LE";
		this.suffixLength = 8;

		this.addInput("bytes", "Message")
			.addOutput("bytes", "Hash");
	}

	get blockLength()
	{
		return this.blockSize / 8;
	}

	transformBlocks(bytes, ...rest)
	{
		const blockLength = this.blockLength;
		const blockCount = Math.floor(bytes.length / blockLength) + 1;

		for (let blockIndex = 0; blockIndex < blockCount; blockIndex++)
		{
			const offset = blockIndex * blockLength;
			let block = bytes.subarray(offset, offset + blockLength);
			if (blockIndex === blockCount - 1)
			{
				// Last block - pad it
				let paddedBlock = block = this.padBlock(block, bytes.length, ...rest);
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

	padBlockMerkle(block, messageLength)
	{
		const blockLength = this.blockLength;

		const length = block.length;
		let paddingLength = (blockLength - this.suffixLength) - (length % blockLength);
		if (paddingLength <= 0)
		{
			paddingLength += blockLength;
		}
		const result = new Uint8Array(length + paddingLength + this.suffixLength);

		// Copy message bytes to padded block:
		result.set(block);
		// Add "1-bit":
		result[length] = this.paddingStartBit;

		// NOTE: The maximum javascript array size is 2^32-1 bytes. That's also the
		// (very theoretical) maximum message length we would be able to handle.
		// That means the low word will store the low 29 bits of the byte length - shifted
		// left by 3 because we actually store *bit* length. And the high word will
		// just store the 3 bits shifted out. For 64 bit hashes, the rest of the appended
		// message length bits are way out of reach and will just be set to 0.
		let messageSizeLo = messageLength << 3;
		let messageSizeHi = messageLength >>> 29;

		let sizeIndex = length + paddingLength;
		if (this.endianness === "BE")
		{
			// Skip to the least significant 64 bits (the higher bits will be 0)
			sizeIndex += this.suffixLength - 8;

			for (let i = 3; i >= 0; i--)
			{
				result[sizeIndex + i] = messageSizeHi;
				result[sizeIndex + i + 4] = messageSizeLo;
				messageSizeHi >>>= 8;
				messageSizeLo >>>= 8;
			}
		}
		else
		{
			for (let i = 0; i < 4; i++)
			{
				result[sizeIndex + i] = messageSizeLo;
				result[sizeIndex + i + 4] = messageSizeHi;
				messageSizeHi >>>= 8;
				messageSizeLo >>>= 8;
			}
		}

		return result;
	}
}

export {
	HashTransform,
	CONSTANTS
};