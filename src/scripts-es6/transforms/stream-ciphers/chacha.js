import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";
import { Salsa20Transform, SIGMA, TAU, UPSILON } from "./salsa20";

function QUARTERROUND(x, a, b, c, d)
{
	x[a] = add(x[a], x[b]); x[d] = rol(x[d] ^ x[a], 16);
	x[c] = add(x[c], x[d]); x[b] = rol(x[b] ^ x[c], 12);
	x[a] = add(x[a], x[b]); x[d] = rol(x[d] ^ x[a],  8);
	x[c] = add(x[c], x[d]); x[b] = rol(x[b] ^ x[c],  7);
}

class ChaChaTransform extends Salsa20Transform
{
	constructor()
	{
		super();
		this.removeOption("xsalsa");
		this.removeOption("rounds");
		this.addOption("xchacha", "XChaCha", false);
		this.addOption("rounds", "Rounds", 8, { min: 1 });
		
		this.core = this.chacha;
	}

	transform(bytes, keyBytes, ivBytes)
	{
		// Lesser known 80 bit key included (see original Salsa family paper, 4.1)
		this.checkKeySize(keyBytes, this.options.xchacha ? 256 : [80, 128, 256]);
		this.checkIVSize(ivBytes, this.options.xchacha ? 192 : 64);

		const state = this.options.xchacha ? this.setupStateXChaCha(keyBytes, ivBytes) : this.setupStateChaCha(keyBytes, ivBytes);

		return this._transform(bytes, state);
	}

	setupStateChaCha(keyBytes, ivBytes)
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
		state[1] = constants[1];
		state[2] = constants[2];
		state[3] = constants[3];
		state[4] = key[0];
		state[5] = key[1];
		state[6] = key[2];
		state[7] = key[3];
		state[8] = key[k + 0];
		state[9] = key[k + 1];
		state[10] = key[k + 2];
		state[11] = key[k + 3];
		state[12] = iv[0];
		state[13] = iv[1];
		state[14] = iv.length > 2 ? iv[2] : 0; // IV length is 192 bits/6 words for XChaCha HChaCha key generation
		state[15] = iv.length > 2 ? iv[3] : 0; // IV length is 192 bits/6 words for XChaCha HChaCha key generation 

		return state;
	}

	setupStateXChaCha(keyBytes, ivBytes)
	{
		const hstate = this.setupStateChaCha(keyBytes, ivBytes);
		this.core(hstate);
		
		const xKey = new Uint32Array(8);
		xKey[0] = hstate[0];
		xKey[1] = hstate[1];
		xKey[2] = hstate[2];
		xKey[3] = hstate[3];
		xKey[4] = hstate[12];
		xKey[5] = hstate[13];
		xKey[6] = hstate[14];
		xKey[7] = hstate[15];
		const xKeyBytes = int32sToBytesLE(xKey);
		// Set up state as new key, and last 8 bytes of nonce/IV:
		return this.setupStateChaCha(xKeyBytes, ivBytes.subarray(16));
	}
	
	chacha(x)
	{
		// TODO: Maybe also align with BLAKE and BLAKE2
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
				QUARTERROUND(x,  0,  4,  8, 12);
				QUARTERROUND(x,  1,  5,  9, 13);
				QUARTERROUND(x,  2,  6, 10, 14);
				QUARTERROUND(x,  3,  7, 11, 15);
			}
			else
			{
				QUARTERROUND(x,  0,  5, 10, 15);
				QUARTERROUND(x,  1,  6, 11, 12);
				QUARTERROUND(x,  2,  7,  8, 13);
				QUARTERROUND(x,  3,  4,  9, 14);
			}
		}
	}
}

export {
	ChaChaTransform
};