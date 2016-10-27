import { Transform, TransformError } from "../transforms";
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

class Blake2sTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addInput("bytes", "Key (optional)")
			.addOutput("bytes", "Hash")
			.addOption("length", "Length", 256, { min: 8, max: 256, step: 8 });
	}

	padMessage(bytes)
	{
		// BLAKE-2: Simple zero padding
		let paddingLength = 64 - bytes.length % 64;
		// Don't pad if already aligned with blocks - except if we have 0 bytes
		if (paddingLength === 64 && bytes.length > 0)
		{
			// TODO: Yeah, we could just return bytes without doing anything, but until we get rid of
			// the current too-much-cloning scheme, let's make absolutely sure the caller's array isn't modified.
			paddingLength = 0;
		}

		const padded = new Uint8Array(bytes.length + paddingLength);
		padded.set(bytes);

		return padded;
	}

	getIV()
	{
		return [
			0x6a09e667, 
			0xbb67ae85, 
			0x3c6ef372, 
			0xa54ff53a, 
			0x510e527f, 
			0x9b05688c, 
			0x1f83d9ab, 
			0x5be0cd19
		];
	}

	transform(bytes, keyBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		if (options.length < 8 || options.length > 256)
		{
			throw new TransformError(`Length must be between 8 and 256 bits. Was ${options.length} bits.`);
		}
		if (options.length % 8 !== 0)
		{
			throw new TransformError(`Length must be a multiple of 8 bits. Was ${options.length} bits.`);
		}

		if (keyBytes.length > 32)
		{
			throw new TransformError(`Key must be between 0 and 256 bits. Was ${keyBytes.length * 8} bits.`);
		}

		const hashByteLength = options.length / 8;
		const isKeyed = keyBytes.length > 0;
		const emptyMessage = bytes.length === 0;

		const h = this.getIV();

		// BLAKE-2: Parameter block: 0x0101kkbb
		h[0] = h[0] ^ 0x01010000 ^ (keyBytes.length << 8) ^ hashByteLength;

		const t = [0, 0];
		const v = new Array(16);

		let byteCounter = 0;

		// BLAKE-2: Can be keyed - the key is prefixed as an extra block
		if (isKeyed)
		{
			const block = this.padMessage(keyBytes);
			const lastBlock = emptyMessage;
			byteCounter += 64;
			t[0] = byteCounter;
			this.transformBlock(block, h, t, v, lastBlock);
		}

		// Keyed empty message should result in H(K), not H(K|M)
		if (!isKeyed || !emptyMessage)
		{
			const padded = this.padMessage(bytes);
			const messageLength = isKeyed ? 64 + bytes.length : bytes.length;
			for (let blockIndex = 0; blockIndex < padded.length; blockIndex += 64)
			{
				const lastBlock = (blockIndex === padded.length - 64);

				const block = padded.subarray(blockIndex, blockIndex + 64);
				
				// BLAKE-2: Counter is in bytes rather than bits
				// and no special rule for blocks with no original content(?)
				byteCounter += 64;
				// TODO: this can be simplified when we do block padding instead of message padding:
				if (byteCounter > messageLength)
				{
					// Block content smaller than block
					byteCounter = messageLength;
				}

				t[0] = byteCounter & 0xffffffff;
				t[1] = (byteCounter / 0x100000000) | 0;

				this.transformBlock(block, h, t, v, lastBlock);
			}
		}
		return int32sToBytesLE(h).subarray(0, hashByteLength);
	}

	transformBlock(block, h, t, v, lastBlock)
	{
		// BLAKE-2: Byte streams are interpreted as LITTLE endian:
		const m = bytesToInt32sLE(block);

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

		v[12] ^= t[0];
		v[13] ^= t[1];

		if (lastBlock)
		{
			v[14] ^= 0xffffffff;
		}

		// BLAKE-2: 10 rounds instead of 14
		for(let i = 0; i < 10; i++)
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

		for (let i = 0; i < 16; i++)
		{
			h[i % 8] ^= v[i];
		}
	}
}

export {
	Blake2sTransform
};