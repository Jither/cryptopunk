import { HashTransform } from "./hash";
import { TransformError } from "../transforms";
import { int64sToBytesLE, bytesToInt64sLE } from "../../cryptopunk.utils";
import { add64, not64, ror64, xor64 } from "../../cryptopunk.bitarith";

// BLAKE2b only differs from BLAKE2s in:
// - word size
// - key size
// - block size
// - IV (SHA-512 IV instead of SHA-256)
// - number of rounds (12 instead of 10)
// - rotation constants in G
// ... but since Javascript doesn't have native 64-bit integers, this is a different implementation.

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
	// BLAKE2b SIGMA[10..11] = SIGMA[0..1]
	const sigmaE = SIGMA[i % 10][e];
	const sigmaE1 = SIGMA[i % 10][e + 1];

	// BLAKE2b vs BLAKE2s: Different rotation constants
	v[a] = add64(v[a], v[b], m[sigmaE]);
	v[d] = ror64(xor64(v[d], v[a]), 32);
	v[c] = add64(v[c], v[d]);
	v[b] = ror64(xor64(v[b], v[c]), 24);
	v[a] = add64(v[a], v[b], m[sigmaE1]);
	v[d] = ror64(xor64(v[d], v[a]), 16);
	v[c] = add64(v[c], v[d]);
	v[b] = ror64(xor64(v[b], v[c]), 63);
}

const BLOCK_LENGTH = 128;
const ROUNDS = 12;

class Blake2bTransform extends HashTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Key (optional)")
			.addOption("size", "Size", 512, { min: 8, max: 512, step: 8 });
	}

	padBlock(block)
	{
		if (block.length === BLOCK_LENGTH)
		{
			return block;
		}
		const paddingLength = BLOCK_LENGTH - block.length % BLOCK_LENGTH;

		const result = new Uint8Array(block.length + paddingLength);
		result.set(block);

		return result;
	}

	getIV()
	{
		// Same constants as SHA-512
		return [
			{ hi: 0x6a09e667, lo: 0xf3bcc908 },
			{ hi: 0xbb67ae85, lo: 0x84caa73b },
			{ hi: 0x3c6ef372, lo: 0xfe94f82b }, 
			{ hi: 0xa54ff53a, lo: 0x5f1d36f1 }, 
			{ hi: 0x510e527f, lo: 0xade682d1 }, 
			{ hi: 0x9b05688c, lo: 0x2b3e6c1f }, 
			{ hi: 0x1f83d9ab, lo: 0xfb41bd6b }, 
			{ hi: 0x5be0cd19, lo: 0x137e2179 }
		];
	}

	transform(bytes, keyBytes)
	{
		const size = this.options.size;

		const keyLength = keyBytes ? keyBytes.length : 0;
		const hashLength = size / 8;

		if (size < 8 || size > 512)
		{
			throw new TransformError(`Size must be between 8 and 512 bits. Was ${size} bits.`);
		}
		if (size % 8 !== 0)
		{
			throw new TransformError(`Size must be a multiple of 8 bits. Was ${size} bits.`);
		}

		if (keyLength > 64)
		{
			throw new TransformError(`Key must be between 0 and 512 bits. Was ${keyBytes.length * 8} bits.`);
		}

		const h = this.getIV();

		// BLAKE-2b: Parameter block:
		// 00: bb kk ff dd
		// 04: ll ll ll ll
		// 08: oo oo oo oo
		// 12: oo oo oo oo
		// 16: nn ii rr rr
		// 20: rr rr rr rr
		// 24: rr rr rr rr
		// 28: rr rr rr rr
		// 32: ss ss ss ss
		// 36: ss ss ss ss
		// 40: ss ss ss ss
		// 44: ss ss ss ss
		// 48: pp pp pp pp
		// 52: pp pp pp pp
		// 56: pp pp pp pp
		// 60: pp pp pp pp
		// dd = depth (1 in sequential mode)
		// ff = fanout (1 in sequential mode)
		// kk = key length in bytes
		// bb = digest length in bytes
		// ll = leaf length (0 in sequential mode)
		// oo = node offset (0 in sequential mode)
		// nn = node depth (0 in sequential mode)
		// ii = inner length (0 in sequential mode)
		// rr = reserved for future use (0)
		// ss = salt
		// pp = personalization
		h[0].lo = h[0].lo ^ 0x01010000 ^ (keyLength << 8) ^ hashLength;

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

		// Mix in key (if any)
		if (keyLength > 0)
		{
			const block = this.padBlock(keyBytes);
			context.byteCounter += BLOCK_LENGTH;

			this.transformBlock(block, context, !blocksRemaining);
		}
		else if (blocksRemaining === 0)
		{
			blocksRemaining = 1;
		}

		// Mix in actual message blocks (if any)
		let offset = 0;
		while (blocksRemaining > 0)
		{
			let block = bytes.subarray(offset, offset + BLOCK_LENGTH);
			const isLastBlock = blocksRemaining === 1;

			context.byteCounter += block.length;

			if (isLastBlock)
			{
				block = this.padBlock(block);
			}

			this.transformBlock(block, context, isLastBlock);
			
			offset += BLOCK_LENGTH;
			blocksRemaining--;
		}

		return int64sToBytesLE(context.h).subarray(0, hashLength);
	}

	transformBlock(block, context, isLastBlock)
	{
		const m = bytesToInt64sLE(block);
		
		const
			h = context.h,
			v = context.v,
			byteCounter = context.byteCounter;
		
		for (let i = 0; i < 8; i++)
		{
			v[i] = { hi: h[i].hi, lo: h[i].lo };
		}

		const iv = this.getIV();
		for (let i = 0; i < 8; i++)
		{
			v[i + 8] = iv[i];
		}

		v[12] = xor64(v[12], { hi: (byteCounter / 0x100000000) | 0 , lo: byteCounter & 0xffffffff });
		// v[13] would always be XOR'ed with 0 - we'll never reach 2^64 byte message length in Javascript

		if (isLastBlock)
		{
			// NOT64 is more efficient than XOR64(, fffff...) and just as readable
			v[14] = not64(v[14]);
		}

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
			h[i] = xor64(h[i], v[i], v[i + 8]);
		}
	}
}

export {
	Blake2bTransform
};