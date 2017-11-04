import { BlockCipherTransform } from "./block-cipher";

// A lot of the original code for this probable hoax is nonsense.
// That won't stop us, though...

const ROUNDS = 5;

const CHAOS1 = [
	0xad, 0x54, 0xf0, 0x43, 0x01, 0x35, 0xfe, 0x24, 0x29, 0xac, 0x73, 0x6d, 0xdf, 0xc7, 0x98, 0xbd, 
	0x5a, 0x2e, 0x95, 0xc1, 0xda, 0x82, 0xfa, 0x28, 0xcb, 0x04, 0x23, 0xed, 0xec, 0xf6, 0xd5, 0x8f, 
	0xa9, 0xb0, 0x30, 0x17, 0x3d, 0xce, 0x45, 0x22, 0x61, 0x9b, 0x04, 0x6d, 0xb7, 0xdc, 0x2a, 0x40, 
	0x15, 0x7b, 0x1d, 0xe9, 0xfd, 0x69, 0xb7, 0xd1, 0x01, 0xbf, 0x71, 0x0c, 0x2e, 0x07, 0x08, 0xb7, 
	0xa6, 0xc7, 0xa6, 0x07, 0x4e, 0x25, 0x87, 0xfc, 0xae, 0x54, 0x8c, 0xa4, 0x98, 0x5e, 0x16, 0xb9, 
	0x3b, 0x44, 0xb5, 0x3c, 0xb0, 0x43, 0x33, 0x19, 0x1c, 0xbe, 0x8a, 0xc6, 0x2c, 0x5a, 0x5c, 0xdd, 
	0x95, 0xaf, 0xba, 0x19, 0x31, 0xd2, 0x32, 0xed, 0x29, 0xcf, 0x1f, 0xe2, 0x72, 0x79, 0xe6, 0x0f, 
	0x3a, 0x19, 0x8e, 0x3a, 0x62, 0xe8, 0x3b, 0x03, 0xbd, 0x1c, 0x08, 0x74, 0x83, 0xb9, 0x4e, 0xfa, 
	0xef, 0x21, 0x74, 0xad, 0x5e, 0x2d, 0x68, 0x3e, 0x7a, 0xb3, 0x12, 0x96, 0xf6, 0xfa, 0x11, 0x08, 
	0x4f, 0x9d, 0xe1, 0xee, 0x2f, 0x0a, 0x85, 0x3a, 0x08, 0x7e, 0x52, 0x44, 0x99, 0x8d, 0x02, 0x9e, 
	0xcc, 0x32, 0x82, 0x35, 0x3b, 0x20, 0xf3, 0xa0, 0xac, 0x23, 0x18, 0x6b, 0x23, 0x73, 0xe4, 0x8f, 
	0x1c, 0xe0, 0x4d, 0x37, 0x19, 0x1c, 0x78, 0x59, 0xba, 0x98, 0x31, 0x54, 0x75, 0xb4, 0x1e, 0x8a, 
	0x86, 0x4d, 0xb6, 0x9d, 0x3d, 0xe6, 0x16, 0x95, 0x36, 0x0f, 0x6e, 0x20, 0xd5, 0x9b, 0x6a, 0x4e, 
	0x10, 0x17, 0x59, 0x8c, 0x9e, 0xa9, 0x60, 0x88, 0xba, 0x68, 0x1e, 0xc7, 0x43, 0x23, 0xda, 0x9f, 
	0xd2, 0x6d, 0x1c, 0xee, 0x21, 0x96, 0xad, 0xb4, 0xf7, 0xc9, 0x53, 0x96, 0x69, 0xa4, 0xe4, 0x3b, 
	0xcf, 0x65, 0xdd, 0x63, 0x34, 0x78, 0xc7, 0x1f, 0x06, 0x90, 0xca, 0xd7, 0xd1, 0x31, 0x2a, 0xc3
];

const P = [
	5, 10, 1, 3, 0, 4, 15, 2, 7, 9, 13, 8, 11, 14, 12, 6, 
	5, 7, 15, 13, 3, 8, 1, 11, 10, 0, 9, 12, 2, 6, 14, 4, 
	4, 6, 12, 14, 1, 0, 13, 5, 7, 9, 10, 11, 2, 15, 8, 3, 
	3, 4, 2, 12, 13, 9, 1, 8, 5, 15, 14, 6, 10, 0, 11, 7, 
	9, 8, 3, 5, 4, 6, 0, 2, 13, 15, 14, 1, 12, 11, 7, 10, 
	14, 13, 3, 11, 0, 2, 1, 10, 7, 9, 4, 5, 15, 6, 12, 8, 
	8, 4, 0, 5, 7, 3, 12, 11, 13, 9, 6, 1, 15, 10, 2, 14, 
	11, 14, 13, 1, 9, 8, 4, 5, 12, 6, 7, 3, 10, 0, 15, 2, 
	13, 12, 2, 1, 6, 9, 14, 11, 3, 10, 8, 15, 4, 5, 7, 0, 
	1, 14, 12, 7, 8, 0, 11, 9, 6, 5, 4, 2, 10, 3, 15, 13, 
	6, 0, 10, 8, 5, 2, 11, 13, 14, 1, 4, 9, 3, 12, 15, 7, 
	12, 0, 5, 13, 2, 4, 8, 6, 3, 15, 9, 10, 14, 7, 1, 11, 
	7, 10, 8, 11, 9, 2, 0, 3, 5, 4, 12, 15, 14, 1, 6, 13, 
	8, 4, 15, 7, 10, 9, 3, 12, 6, 14, 0, 2, 1, 5, 13, 11, 
	11, 13, 14, 3, 5, 12, 7, 6, 2, 0, 10, 8, 1, 15, 4, 9, 
	1, 6, 3, 8, 7, 4, 11, 14, 0, 10, 9, 2, 15, 12, 5, 13
];

function f(perms)
{
	let result =
		(( perms[ 0] |  perms[ 1]) + (perms[ 2] |  perms[ 3])) ^
		(( perms[ 4] +  perms[ 5]) + (perms[ 6] ^  perms[ 7]));
	result +=
		((~perms[ 8] ^  perms[ 9]) + (perms[10] & ~perms[11])) ^
		(( perms[12] ^ ~perms[13]) + (perms[14] ^  perms[15]));
	return result & 0xff;
}

class IraqiTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	generateKeyMaterial(keyBytes)
	{
		const fixedKey = [
			0x2e, 0xf5, 0x8a, 0x0d, 0xf4, 0xe9, 0xee, 0x9a, 
			0x8b, 0x1e, 0xf1, 0x5a, 0x2f, 0xcd, 0xab, 0x61, 
			0xdf, 0xbe, 0x1c, 0x0a, 0xb9, 0x0d, 0x17, 0x89, 
			0x1e, 0xd0, 0xfe, 0x8f, 0xa5, 0x65, 0x1b, 0x30
		];

		let ciphertext;
		const chaos = new Uint8Array(256);

		// Mix key bytes into chaos
		for (let i = 0; i < 256; i++)
		{
			chaos[i] = CHAOS1[i] ^ keyBytes[i % 20];
		}

		for (let i = 0; i < 4; i++)
		{
			ciphertext = this.roundInit(fixedKey, 32, chaos);

			for (let j = 0; j < 256; j++)
			{
				chaos[j] ^= ciphertext[j % 32];
			}

			for (let j = 0; j < 32; j++)
			{
				fixedKey[j] = ciphertext[j];
			}
		}

		const rndGlob = new Array(256),
			rndPerm = new Array(256);

		for (let i = 0; i < 16; i++)
		{
			let err = 0;
			for (let j = 0; j < 16; j++)
			{
				ciphertext = this.roundInit(ciphertext, 4, chaos);

				for (let k = 0; k < j; k++)
				{
					if (rndPerm[i * 16 + k] === (ciphertext[7] % 16))
					{
						err = 1;
						ciphertext = this.roundInit(ciphertext, 4, chaos);
						break; // k = j
					}
				}

				if (err === 0)
				{
					rndPerm[i * 16 + j] = ciphertext[7] % 16;
				}
				else
				{
					err = 0;
					j--;
				}
			}
		}

		let err = 0;
		for (let i = 0; i < 256; i++)
		{
			ciphertext = this.roundInit(ciphertext, 4, chaos);

			for (let j = 0; j < i; j++)
			{
				if (rndGlob[j] === (ciphertext[7] % 256))
				{
					err = 1;
					ciphertext = this.roundInit(ciphertext, 4, chaos);
					break; // j = i
				}
			}
			if (err === 0)
			{
				rndGlob[i] = ciphertext[7] % 256;
			}
			else
			{
				err = 0;
				i--;
			}
		}

		for (let i = 0; i < 256; i++)
		{
			chaos[i] ^= keyBytes[i % 20];
		}

		for (let i = 0; i < 4; i++)
		{
			ciphertext = this.roundInit(fixedKey, 32, chaos);

			for (let j = 0; j < 256; j++)
			{
				chaos[j] ^= ciphertext[j % 32];
			}

			for (let j = 0; j < 32; j++)
			{
				fixedKey[j] = ciphertext[j];
			}
		}

		return {
			rndGlob,
			rndPerm,
			chaos
		};
	}	

	roundInit(plaintext, rounds, chaos)
	{
		const
			left = new Array(rounds),
			right = new Array(rounds);

		for (let i = 0; i < rounds; i++)
		{
			left[i] = new Array(16);
			right[i] = new Array(16);
		}

		// For now, just to avoid ESLint errors
		const ciphertext = new Array(32);

		for (let i = 0; i < 16; i++)
		{
			left[0][i] = plaintext[i];
			right[0][i] = plaintext[i + 16];
		}

		for (let i = 1; i < rounds; i++)
		{
			const oneWayRes = this.oneWayInit(right[i - 1], chaos);

			for (let y = 0; y < 16; y++)
			{
				left[i][y] = right[i - 1][y];
				right[i][y] = left[i - 1][y] ^ oneWayRes[y];
			}
		}

		for (let i = 0; i < 16; i++)
		{
			ciphertext[i] = left[rounds - 1][i];
			ciphertext[i + 16] = right[rounds - 1][i];
		}

		return ciphertext;
	}

	oneWayInit(matrix, chaos)
	{
		const result = new Array(16);
		const perms = new Array(16);

		for (let i = 0; i < 16; i++)
		{
			for (let z = 0; z < 16; z++)
			{
				perms[z] = chaos[matrix[P[i * 16 + z]]];
			}
			result[i] = f(perms);
		}

		return result;
	}

	oneWay(matrix, rndPerm, rndGlob, chaos)
	{
		const perms = new Array(16);

		const result = new Array(16);
		for (let i = 0; i < 16; i++)
		{
			for (let z = 0; z < 16; z++)
			{
				perms[z] = chaos[matrix[rndPerm[i * 16 + z]]];
			}
			result[i] = f(perms);

			result[i] += rndGlob[result[i]] + rndGlob[i];
		}
		return result;
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 160);

		const keyMaterial = this.generateKeyMaterial(keyBytes);

		return this.transformBlocks(bytes, 256, keyMaterial);
	}

	transformBlock(block, dest, destOffset, keyMaterial)
	{
		const
			rndPerm = keyMaterial.rndPerm,
			rndGlob = keyMaterial.rndGlob,
			chaos = keyMaterial.chaos;

		const left = new Array(ROUNDS + 1);
		const right = new Array(ROUNDS + 1);
		left[0] = Uint8Array.from(block.subarray(0, 16));
		right[0] = Uint8Array.from(block.subarray(16, 32));

		for (let i = 1; i <= ROUNDS; i++)
		{
			left[i] = new Uint8Array(16);
			right[i] = new Uint8Array(16);
			const oneWayRes = this.oneWay(right[i - 1], rndPerm, rndGlob, chaos);

			for (let y = 0; y < 16; y++)
			{
				left[i][y] = right[i - 1][y];
				right[i][y] = left[i - 1][y] ^ oneWayRes[y];
			}
		}

		dest.set(right[ROUNDS]);
		dest.set(left[ROUNDS], 16);
	}
}

class IraqiEncryptTransform extends IraqiTransform
{
	constructor()
	{
		super(false);
	}
}

class IraqiDecryptTransform extends IraqiTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	IraqiEncryptTransform,
	IraqiDecryptTransform
};