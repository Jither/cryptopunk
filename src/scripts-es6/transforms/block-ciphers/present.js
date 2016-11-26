import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt64sBE, int64sToBytesBE } from "../../cryptopunk.utils";
import { and64, or64, xor64, rol64, shl64, shr64 } from "../../cryptopunk.bitarith";

const ROUNDS = 31;

const SBOX = [
	0xc, 0x5, 0x6, 0xb, 0x9, 0x0, 0xa, 0xd, 0x3, 0xe, 0xf, 0x8, 0x4, 0x7, 0x1, 0x2
];

const ISBOX = [
	0x5, 0xe, 0xf, 0x8, 0xc, 0x1, 0x2, 0xd, 0xb, 0x4, 0x6, 0x3, 0x0, 0x7, 0x9, 0xa
];

const LOW_WORD = { hi: 0, lo: 0xffff };

class PresentTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, [80, 128]);

		const subKeys = keyBytes.length === 10 ? this.generateSubKeys80(keyBytes) : this.generateSubKeys128(keyBytes);
		return this.transformBlocks(bytes, 64, subKeys);
	}

	// TODO: Optimize these (it can be done while making it more readable)
	// Currently, the 80 bits are stored as ffffffff ffffffff 00000000 0000ffff
	generateSubKeys80(keyBytes)
	{
		const subKeys = new Array(ROUNDS + 1);
		let [keyHigh, keyLow] = bytesToInt64sBE(keyBytes);
		// Hack for now: Key-low is supposed to be stored in the least significant 2 bytes, but we've loaded it into the most significant 2.
		keyLow = shr64(keyLow, 48);

		subKeys[0] = keyHigh;
		for (let i = 1; i < subKeys.length; i++)
		{
			let temp = keyHigh;
			// ROL61 on 80-bit integer
			keyHigh = or64(shl64(keyHigh, 61), shl64(keyLow, 45));
			keyHigh = or64(keyHigh, shr64(temp, 19));
			keyLow = and64(shr64(temp, 3), LOW_WORD);

			temp = keyHigh.hi >>> 28;
			keyHigh.hi &= 0x0fffffff;
			temp = SBOX[temp];
			keyHigh.hi |= temp << 28;

			keyLow.lo ^= (i & 0x01) << 15;
			keyHigh.lo ^= i >>> 1;

			subKeys[i] = keyHigh;
		}

		return subKeys;
	}

	generateSubKeys128(keyBytes)
	{
		const subKeys = new Array(ROUNDS + 1);
		let [keyHigh, keyLow] = bytesToInt64sBE(keyBytes);
		subKeys[0] = keyHigh;
		for (let i = 1; i < subKeys.length; i++)
		{
			const temp = keyHigh;
			// ROL61 on 128-bit integer
			keyHigh = or64(shl64(keyHigh, 61), shr64(keyLow, 3));
			keyLow  = or64(shr64(temp, 3), shl64(keyLow, 61));

			let temp1 = keyHigh.hi >>> 28;
			let temp2 = (keyHigh.hi >>> 24) & 0x0f;
			keyHigh.hi &= 0x00ffffff;
			temp1 = SBOX[temp1];
			temp2 = SBOX[temp2];
			keyHigh.hi |= (temp1 << 28) | (temp2 << 24);

			keyLow.hi ^= (i & 0x03) << 30;
			keyHigh.lo ^= i >>> 2;
			subKeys[i] = keyHigh;
		}

		return subKeys;
	}
}

class PresentEncryptTransform extends PresentTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let state = bytesToInt64sBE(block)[0];

		for (let i = 0; i < ROUNDS; i++)
		{
			state = xor64(state, subKeys[i]);

			for (let sboxIndex = 0; sboxIndex < 16; sboxIndex++)
			{
				const sboxValue = state.lo & 0x0f;
				state.lo &= 0xfffffff0;
				state.lo |= SBOX[sboxValue];
				state = rol64(state, 4);
			}

			const temp = { hi: 0, lo: 0 };
			for (let k = 0; k < 64; k++)
			{
				let pos = (16 * k) % 63;
				if (k === 63)
				{
					pos = 63;
				}
				const bit = (k < 32 ? (state.lo >>> k) : (state.hi >>> (k - 32))) & 0x01;
				if (pos < 32)
				{
					temp.lo |= bit << pos;
				}
				else
				{
					temp.hi |= bit << (pos - 32);
				}
			}
			state = temp;
		}
		state = xor64(state, subKeys[ROUNDS]);

		dest.set(int64sToBytesBE([state]), destOffset);
	}
}

class PresentDecryptTransform extends PresentTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let state = bytesToInt64sBE(block)[0];

		for (let i = ROUNDS; i > 0; i--)
		{
			state = xor64(state, subKeys[i]);

			const temp = { hi: 0, lo: 0 };
			for (let k = 0; k < 64; k++)
			{
				let pos = (4 * k) % 63; // Different for decryption
				if (k === 63)
				{
					pos = 63;
				}
				const bit = (k < 32 ? (state.lo >>> k) : (state.hi >>> (k - 32))) & 0x01;
				if (pos < 32)
				{
					temp.lo |= bit << pos;
				}
				else
				{
					temp.hi |= bit << (pos - 32);
				}
			}
			state = temp;

			for (let sboxIndex = 0; sboxIndex < 16; sboxIndex++)
			{
				const sboxValue = state.lo & 0x0f;
				state.lo &= 0xfffffff0;
				state.lo |= ISBOX[sboxValue]; // Different for decryption
				state = rol64(state, 4);
			}
		}
		state = xor64(state, subKeys[0]);

		dest.set(int64sToBytesBE([state]), destOffset);
	}
}

export {
	PresentEncryptTransform,
	PresentDecryptTransform
};