import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { rol, ror, add, sub } from "../../cryptopunk.bitarith";

// Derived from SQRT(766965), where 76, 69, 65 is ASCII for "LEA" (original English paper gives "95" for the last value)
const DELTA = [
	0xc3efe9db,
	0x44626b02,
	0x79e27c8a,
	0x78df30ec,
	0x715ea49e,
	0xc785da0a,
	0xe04ef22a,
	0xe5c40957
];

const ROTS = [1, 3, 6, 11, 13, 17];

const RECOMMENDED_ROUND_COUNTS = {
	128: 24,
	192: 28,
	256: 32
};

class LeaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		const keySize = this.checkBytesSize("Key", keyBytes, [128, 192, 256]);
		const rounds = RECOMMENDED_ROUND_COUNTS[keySize];
		const keys = this.generateKeys(keyBytes, rounds);

		return this.transformBlocks(bytes, 128, keys);
	}

	generateKeys(keyBytes, rounds)
	{
		const k = bytesToInt32sLE(keyBytes);

		const keys = new Array(rounds);
		for (let r = 0; r < rounds; r++)
		{
			let d, rk;
			switch (k.length)
			{
				case 4:
					d = DELTA[r % 4];
					for (let i = 0; i < 4; i++)
					{
						k[i] = rol(add(k[i], rol(d, r + i)), ROTS[i]);
					}
					rk = [k[0], k[1], k[2], k[1], k[3], k[1]];
					break;
				case 6:
					d = DELTA[r % 6];
					rk = new Array(6);
					for (let i = 0; i < 6; i++)
					{
						rk[i] = k[i] = rol(add(k[i], rol(d, r + i)), ROTS[i]);
					}
					break;
				case 8:
					d = DELTA[r % 8];
					rk = new Array(6);
					for (let i = 0; i < 6; i++)
					{
						const index = (6 * r + i) % 8;
						rk[i] = k[index] = rol(add(k[index], rol(d, r + i)), ROTS[i]);
					}
					break;
			}
			keys[r] = rk;
		}
		
		return keys;
	}
}

class LeaEncryptTransform extends LeaTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const x = bytesToInt32sLE(block);

		for (let r = 0; r < keys.length; r++)
		{
			const rk = keys[r];
			const x0 = rol(add(x[0] ^ rk[0], x[1] ^ rk[1]), 9);
			const x1 = ror(add(x[1] ^ rk[2], x[2] ^ rk[3]), 5);
			const x2 = ror(add(x[2] ^ rk[4], x[3] ^ rk[5]), 3);
			const x3 = x[0];
			x[0] = x0;
			x[1] = x1;
			x[2] = x2;
			x[3] = x3;
		}

		dest.set(int32sToBytesLE(x), destOffset);
	}
}

class LeaDecryptTransform extends LeaTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const x = bytesToInt32sLE(block);

		for (let r = 0; r < keys.length; r++)
		{
			const rk = keys[r];
			const x0 = x[3];
			const x1 = sub(ror(x[0], 9), x0 ^ rk[0]) ^ rk[1];
			const x2 = sub(rol(x[1], 5), x1 ^ rk[2]) ^ rk[3];
			const x3 = sub(rol(x[2], 3), x2 ^ rk[4]) ^ rk[5];
			x[0] = x0;
			x[1] = x1;
			x[2] = x2;
			x[3] = x3;
		}

		dest.set(int32sToBytesLE(x), destOffset);
	}

	generateKeys(keyBytes, rounds)
	{
		const keys = super.generateKeys(keyBytes, rounds);

		keys.reverse();

		return keys;
	}
}

export {
	LeaEncryptTransform,
	LeaDecryptTransform
};