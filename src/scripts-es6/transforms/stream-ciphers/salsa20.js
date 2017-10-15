import { Transform, TransformError } from "../transforms";
import { bytesToInt32sLE, int32sToBytesLE, checkSize } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]; // "expand 32-byte k" as LE uint32
const TAU   = [0x61707865, 0x3120646e, 0x79622d36, 0x6b206574]; // "expand 16-byte k" as LE uint32

class Salsa20Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input");
		this.addInput("bytes", "Key");
		this.addInput("bytes", "IV");
		this.addOutput("bytes", "Output");
	}

	transform(bytes, keyBytes, ivBytes)
	{
		this.checkKeySize(keyBytes, [128, 256]);
		this.checkIVSize(ivBytes, 64);

		const state = this.setupState(keyBytes, ivBytes);

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

	fillKeyStream64Bytes(state, stream)
	{
		const x = new Uint32Array(state);

		for (let i = 20; i > 0; i -= 2)
		{
			x[ 4] ^= rol(add(x[ 0],x[12]), 7);
			x[ 8] ^= rol(add(x[ 4],x[ 0]), 9);
			x[12] ^= rol(add(x[ 8],x[ 4]),13);
			x[ 0] ^= rol(add(x[12],x[ 8]),18);
			x[ 9] ^= rol(add(x[ 5],x[ 1]), 7);
			x[13] ^= rol(add(x[ 9],x[ 5]), 9);
			x[ 1] ^= rol(add(x[13],x[ 9]),13);
			x[ 5] ^= rol(add(x[ 1],x[13]),18);
			x[14] ^= rol(add(x[10],x[ 6]), 7);
			x[ 2] ^= rol(add(x[14],x[10]), 9);
			x[ 6] ^= rol(add(x[ 2],x[14]),13);
			x[10] ^= rol(add(x[ 6],x[ 2]),18);
			x[ 3] ^= rol(add(x[15],x[11]), 7);
			x[ 7] ^= rol(add(x[ 3],x[15]), 9);
			x[11] ^= rol(add(x[ 7],x[ 3]),13);
			x[15] ^= rol(add(x[11],x[ 7]),18);
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

		for (let i = 0; i < 16; i++)
		{
			x[i] = add(x[i], state[i]);
		}

		int32sToBytesLE(x, stream);
	}
	
	setupState(keyBytes, ivBytes)
	{
		const state = new Uint32Array(16);
		const key = bytesToInt32sLE(keyBytes);
		const iv = bytesToInt32sLE(ivBytes);
		let constants, k;
		if (keyBytes.length === 32)
		{
			constants = SIGMA;
			k = 4;
		}
		else
		{
			constants = TAU;
			k = 0;
		}

		state[0] = constants[0];
		state[1] = key[0];
		state[2] = key[1];
		state[3] = key[2];
		state[4] = key[3];
		state[5] = constants[1];
		state[6] = iv[0];
		state[7] = iv[1];
		state[8] = 0;
		state[9] = 0;
		state[10] = constants[2];
		state[11] = key[k + 0];
		state[12] = key[k + 1];
		state[13] = key[k + 2];
		state[14] = key[k + 3];
		state[15] = constants[3];

		return state;
	}

	checkKeySize(keyBytes, requiredSize)
	{
		const size = keyBytes.length * 8;
		const requirement = checkSize(size, requiredSize);
		if (requirement)
		{
			throw new TransformError(`Key size must be ${requirement} bits. Was: ${size} bits.`);
		}
		return size;
	}

	checkIVSize(ivBytes, requiredSize)
	{
		const size = ivBytes.length * 8;
		const requirement = checkSize(size, requiredSize);
		if (requirement)
		{
			throw new TransformError(`IV size must be ${requirement} bits. Was: ${size} bits.`);
		}
		return size;
	}
}

export {
	Salsa20Transform
};