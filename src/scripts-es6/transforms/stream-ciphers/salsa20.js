import { StreamCipherTransform } from "./stream-cipher";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const SIGMA   = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]; // "expand 32-byte k" as LE uint32
const TAU     = [0x61707865, 0x3120646e, 0x79622d36, 0x6b206574]; // "expand 16-byte k" as LE uint32
const UPSILON = [0x61707865, 0x3120646e, 0x79622d30, 0x6b206574]; // "expand 10-byte k" as LE uint32

class Salsa20Transform extends StreamCipherTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input");
		this.addInput("bytes", "Key");
		this.addInput("bytes", "IV");
		this.addOutput("bytes", "Output");
		this.addOption("xsalsa", "XSalsa20", false);
		this.addOption("rounds", "Rounds", 20, { min: 1 });

		this.core = this.salsa;
	}

	transform(bytes, keyBytes, ivBytes)
	{
		// Lesser known 80 bit key included (see original Salsa family paper, 4.1)
		this.checkBytesSize("Key", keyBytes, this.options.xsalsa ? 256 : [80, 128, 256]);
		this.checkBytesSize("IV", ivBytes, this.options.xsalsa ? 192 : 64);

		const state = this.options.xsalsa ? this.setupStateXSalsa(keyBytes, ivBytes) : this.setupState(keyBytes, ivBytes);

		return this._transform(bytes, state);
	}

	_transform(bytes, state)
	{
		const result = new Uint8Array(bytes.length);
		const stream = new Uint8Array(64);

		for (let startIndex = 0; startIndex < bytes.length; startIndex += 64)
		{
			this.fillKeyStream64Bytes(state, stream);
			state[8] = add(state[8], 1); // Add 1 to counter with overflow (not that it's likely to happen in this demonstration library)
			if (state[8] === 0)
			{
				state[9] = add(state[9], 1); // "Stopping at 2^70 bytes per nonce is user's responsibility"
			}

			// Process 64 bytes or until end of message:
			const endIndex = Math.min(startIndex + 64, bytes.length);
			let streamIndex = 0;
			for (let i = startIndex; i < endIndex; i++)
			{
				result[i] = bytes[i] ^ stream[streamIndex++];
			}
		}
		return result;
	}

	salsa(x)
	{
		// TODO: Maybe also align with BLAKE and BLAKE2 (ChaCha20)
		for (let i = 0; i < this.options.rounds; i++)
		{
			// We look at the 16 words as a matrix:
			//  0  1  2  3
			//  4  5  6  7
			//  8  9 10 11
			// 12 13 14 15
			//
			
			if (i % 2 === 0)
			{
				// Even round:
				// Add diagonal+0 ( 0) to diagonal-1 (12), rol  7, and xor with diagonal+1 ( 4)
				// Add diagonal+1 ( 4) to diagonal+0 ( 0), rol  9, and xor with diagonal+2 ( 8)
				// Add diagonal+2 ( 8) to diagonal+1 ( 4), rol 13, and xor with diagonal+3 (12)
				// Add diagonal+3 (12) to diagonal+2 ( 8), rol 18, and xor with diagonal+0 ( 0)
				x[ 4] ^= rol(add(x[ 0],x[12]), 7);
				x[ 8] ^= rol(add(x[ 4],x[ 0]), 9);
				x[12] ^= rol(add(x[ 8],x[ 4]),13);
				x[ 0] ^= rol(add(x[12],x[ 8]),18);

				// Add diagonal+0 ( 5) to diagonal-1 ( 1), rol  7, and xor with diagonal+1 ( 9)
				x[ 9] ^= rol(add(x[ 5],x[ 1]), 7);
				x[13] ^= rol(add(x[ 9],x[ 5]), 9);
				x[ 1] ^= rol(add(x[13],x[ 9]),13);
				x[ 5] ^= rol(add(x[ 1],x[13]),18);
				// Add diagonal+0 (10) to diagonal-1 ( 6), rol  7, and xor with diagonal+1 (14)
				x[14] ^= rol(add(x[10],x[ 6]), 7);
				x[ 2] ^= rol(add(x[14],x[10]), 9);
				x[ 6] ^= rol(add(x[ 2],x[14]),13);
				x[10] ^= rol(add(x[ 6],x[ 2]),18);
				// Add diagonal+0 (15) to diagonal-1 (11), rol  7, and xor with diagonal+1 ( 3)
				x[ 3] ^= rol(add(x[15],x[11]), 7);
				x[ 7] ^= rol(add(x[ 3],x[15]), 9);
				x[11] ^= rol(add(x[ 7],x[ 3]),13);
				x[15] ^= rol(add(x[11],x[ 7]),18);
			}
			else
			{
				// Odd round:
				// These are the same operations as the even rounds,
				// except they're working on rows rather than columns. An alternative is to
				// transpose the matrix between rounds.
				x[ 1] ^= rol(add(x[ 0],x[ 3]), 7);
				x[ 2] ^= rol(add(x[ 1],x[ 0]), 9);
				x[ 3] ^= rol(add(x[ 2],x[ 1]),13);
				x[ 0] ^= rol(add(x[ 3],x[ 2]),18);
				x[ 6] ^= rol(add(x[ 5],x[ 4]), 7);
				x[ 7] ^= rol(add(x[ 6],x[ 5]), 9);
				x[ 4] ^= rol(add(x[ 7],x[ 6]),13);
				x[ 5] ^= rol(add(x[ 4],x[ 7]),18);
				x[11] ^= rol(add(x[10],x[ 9]), 7);
				x[ 8] ^= rol(add(x[11],x[10]), 9);
				x[ 9] ^= rol(add(x[ 8],x[11]),13);
				x[10] ^= rol(add(x[ 9],x[ 8]),18);
				x[12] ^= rol(add(x[15],x[14]), 7);
				x[13] ^= rol(add(x[12],x[15]), 9);
				x[14] ^= rol(add(x[13],x[12]),13);
				x[15] ^= rol(add(x[14],x[13]),18);
			}
		}
	}

	fillKeyStream64Bytes(state, stream)
	{
		const x = new Uint32Array(state);

		this.core(x);

		for (let i = 0; i < 16; i++)
		{
			x[i] = add(x[i], state[i]);
		}

		int32sToBytesLE(x, stream);
	}
	
	setupStateXSalsa(keyBytes, ivBytes)
	{
		const hstate = this.setupState(keyBytes, ivBytes);
		this.core(hstate);
		
		const xKey = new Uint32Array(8);
		xKey[0] = hstate[0];
		xKey[1] = hstate[5];
		xKey[2] = hstate[10];
		xKey[3] = hstate[15];
		xKey[4] = hstate[6];
		xKey[5] = hstate[7];
		xKey[6] = hstate[8];
		xKey[7] = hstate[9];
		const xKeyBytes = int32sToBytesLE(xKey);
		// Set up state as new key, and last 8 bytes of nonce/IV:
		return this.setupState(xKeyBytes, ivBytes.subarray(16));
	}

	setupState(keyBytes, ivBytes)
	{
		let constants, k;
		switch (keyBytes.length)
		{
			case 32:
				constants = SIGMA;
				k = 4;
				break;
			case 16:
				// 16 byte key is repeated to form 32 byte key
				constants = TAU;
				k = 0;
				break;
			case 10:
				// 10 byte key is 0-padded to form 16 byte key
				const paddedKeyBytes = new Uint8Array(16);
				paddedKeyBytes.set(keyBytes);
				keyBytes = paddedKeyBytes;
				constants = UPSILON;
				k = 0;
				break;
		}

		const state = new Uint32Array(16);
		const key = bytesToInt32sLE(keyBytes);
		const iv = bytesToInt32sLE(ivBytes);

		state[0] = constants[0];
		state[1] = key[0];
		state[2] = key[1];
		state[3] = key[2];
		state[4] = key[3];
		state[5] = constants[1];
		state[6] = iv[0];
		state[7] = iv[1];
		state[8] = iv.length > 2 ? iv[2] : 0; // IV length is 192 bits/6 words for XSalsa HSalsa key generation
		state[9] = iv.length > 2 ? iv[3] : 0; // IV length is 192 bits/6 words for XSalsa HSalsa key generation 
		state[10] = constants[2];
		state[11] = key[k + 0];
		state[12] = key[k + 1];
		state[13] = key[k + 2];
		state[14] = key[k + 3];
		state[15] = constants[3];

		return state;
	}
}

export {
	Salsa20Transform,
	SIGMA, TAU, UPSILON
};