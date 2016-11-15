import { HashTransform, CONSTANTS } from "./hash";
import { TransformError } from "../transforms";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add, ror } from "../../cryptopunk.bitarith";

const SIGMA = [
  [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15 ],
  [14, 10,  4,  8,  9, 15, 13,  6,  1, 12,  0,  2, 11,  7,  5,  3 ],
  [11,  8, 12,  0,  5,  2, 15, 13, 10, 14,  3,  6,  7,  1,  9,  4 ],
  [ 7,  9,  3,  1, 13, 12, 11, 14,  2,  6,  5, 10,  4,  0, 15,  8 ],
  [ 9,  0,  5,  7,  2,  4, 10, 15, 14,  1, 11, 12,  6,  8,  3, 13 ],
  [ 2, 12,  6, 10,  0, 11,  8,  3,  4, 13,  7,  5, 15, 14,  1,  9 ],
  [12,  5,  1, 15, 14, 13,  4, 10,  0,  7,  6,  3,  9,  2,  8, 11 ],
  [13, 11,  7, 14, 12,  1,  3,  9,  5,  0, 15,  4,  8,  6,  2, 10 ],
  [ 6, 15, 14,  9, 11,  3,  0,  8, 12,  2, 13,  7,  1,  4, 10,  5 ],
  [10,  2,  8,  4,  7,  6,  1,  5, 15, 11,  9, 14,  3, 12, 13,  0 ],
  [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15 ],
  [14, 10,  4,  8,  9, 15, 13,  6,  1, 12,  0,  2, 11,  7,  5,  3 ],
  [11,  8, 12,  0,  5,  2, 15, 13, 10, 14,  3,  6,  7,  1,  9,  4 ],
  [ 7,  9,  3,  1, 13, 12, 11, 14,  2,  6,  5, 10,  4,  0, 15,  8 ],
  [ 9,  0,  5,  7,  2,  4, 10, 15, 14,  1, 11, 12,  6,  8,  3, 13 ],
  [ 2, 12,  6, 10,  0, 11,  8,  3,  4, 13,  7,  5, 15, 14,  1,  9 ]
];

function g(m, v, i, a, b, c, d, e)
{
	const sigmaE = SIGMA[i][e]; // i % 10 really, but i is already less than 10 for BLAKE-2s
	const sigmaE1 = SIGMA[i][e + 1];
	v[a] = add(v[a], v[b], m[sigmaE]);
	v[d] = ror(v[d] ^ v[a], 16);
	v[c] = add(v[c], v[d]);
	v[b] = ror(v[b] ^ v[c], 12);
	v[a] = add(v[a], v[b], m[sigmaE1]);
	v[d] = ror(v[d] ^ v[a], 8);
	v[c] = add(v[c], v[d]);
	v[b] = ror(v[b] ^ v[c], 7);
}

const BLOCK_LENGTH = 64;
const ROUNDS = 10;

class Blake2sTransform extends HashTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Key (optional)")
			.addOption("size", "Size", 256, { min: 8, max: 256, step: 8 });
	}

	padBlock(block)
	{
		if (block.length === BLOCK_LENGTH)
		{
			return block;
		}
		// BLAKE-2: Simple zero padding
		const paddingLength = BLOCK_LENGTH - block.length % BLOCK_LENGTH;

		const result = new Uint8Array(block.length + paddingLength);
		result.set(block);

		return result;
	}

	getIV()
	{
		// Same constants as SHA-256
		return [
			CONSTANTS.SQRT2, 
			CONSTANTS.SQRT3, 
			CONSTANTS.SQRT5, 
			CONSTANTS.SQRT7, 
			CONSTANTS.SQRT11, 
			CONSTANTS.SQRT13, 
			CONSTANTS.SQRT17, 
			CONSTANTS.SQRT19
		];
	}

	transform(bytes, keyBytes)
	{
		const size = this.options.size;

		const keyLength = keyBytes ? keyBytes.length : 0;
		const hashLength = size / 8;

		if (size < 8 || size > 256)
		{
			throw new TransformError(`Size must be between 8 and 256 bits. Was ${size} bits.`);
		}
		if (size % 8 !== 0)
		{
			throw new TransformError(`Size must be a multiple of 8 bits. Was ${size} bits.`);
		}

		if (keyLength > 32)
		{
			throw new TransformError(`Key must be between 0 and 256 bits. Was ${keyBytes.length * 8} bits.`);
		}

		const h = this.getIV();

		// BLAKE-2s: Parameter block:
		// 00: bb kk ff dd
		// 04: ll ll ll ll
		// 08: oo oo oo oo
		// 12: oo oo nn ii
		// 16: ss ss ss ss
		// 20: ss ss ss ss
		// 24: pp pp pp pp
		// 28: pp pp pp pp
		// dd = depth (1 in sequential mode)
		// ff = fanout (1 in sequential mode)
		// kk = key length in bytes
		// bb = digest length in bytes
		// ll = leaf length (0 in sequential mode)
		// oo = node offset (0 in sequential mode)
		// nn = node depth (0 in sequential mode)
		// ii = inner length (0 in sequential mode)
		// ss = salt
		// pp = personalization
		h[0] = h[0] ^ 0x01010000 ^ (keyLength << 8) ^ hashLength;

		const context = {
			h,
			v: new Array(16),
			byteCounter: 0
		};

		// 0 bytes, no key => 1 block
		// 0 bytes, key => 1 block
		// 1 byte, no key => 1 block
		// 1 byte, key => 2 blocks
		let blocksRemaining = Math.ceil(bytes.length / BLOCK_LENGTH);

		// BLAKE-2: Can be keyed - the key is prefixed as an extra block
		if (keyLength > 0)
		{
			const block = this.padBlock(keyBytes);
			context.byteCounter += BLOCK_LENGTH;

			this.transformBlock(block, context, !blocksRemaining);
		}
		else if (blocksRemaining === 0)
		{
			// Keyed empty message should result in H(K), not H(K|M)),
			// but unkeyed empty message should still result in H(M)
			blocksRemaining = 1;
		}

		// Mix in actual message blocks (if any)
		let offset = 0;
		while (blocksRemaining > 0)
		{
			let block = bytes.subarray(offset, offset + BLOCK_LENGTH);
			const isLastBlock = blocksRemaining === 1;

			// BLAKE-2: Counter is in bytes rather than bits
			// and no special rule for blocks with no original message content
			context.byteCounter += block.length;

			if (isLastBlock)
			{
				block = this.padBlock(block);
			}

			this.transformBlock(block, context, isLastBlock);
			
			offset += BLOCK_LENGTH;
			blocksRemaining--;
		}

		return int32sToBytesLE(context.h).subarray(0, hashLength);
	}

	transformBlock(block, context, isLastBlock)
	{
		// BLAKE-2: Byte streams are interpreted as LITTLE endian:
		const m = bytesToInt32sLE(block);
		
		const
			h = context.h,
			v = context.v,
			byteCounter = context.byteCounter;
		
		// BLAKE-2: Different initialization of working vector:
		for (let i = 0; i < 8; i++)
		{
			v[i] = h[i];
		}

		const iv = this.getIV();
		for (let i = 0; i < 8; i++)
		{
			v[i + 8] = iv[i];
		}

		v[12] ^= byteCounter & 0xffffffff;
		v[13] ^= (byteCounter / 0x100000000) | 0;

		if (isLastBlock)
		{
			v[14] ^= 0xffffffff;
		}

		// BLAKE-2: 10 rounds instead of 14
		for(let i = 0; i < ROUNDS; i++)
		{
			// column step
			g(m, v, i, 0,  4,  8, 12,  0);
			g(m, v, i, 1,  5,  9, 13,  2);
			g(m, v, i, 2,  6, 10, 14,  4);
			g(m, v, i, 3,  7, 11, 15,  6);
			// diagonal step
			g(m, v, i, 0,  5, 10, 15,  8);
			g(m, v, i, 1,  6, 11, 12, 10);
			g(m, v, i, 2,  7,  8, 13, 12);
			g(m, v, i, 3,  4,  9, 14, 14);
		}

		for (let i = 0; i < 8; i++)
		{
			h[i] ^= v[i] ^ v[i + 8];
		}
	}
}

export {
	Blake2sTransform
};