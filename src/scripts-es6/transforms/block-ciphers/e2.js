import { BlockCipherTransform } from "./block-cipher";
import { gfExp256 } from "../../cryptopunk.galois";
import { int32sToBytesBE, bytesToInt32sBE } from "../../cryptopunk.utils";
import { xorBytes, modInv32, mul, rolBytes } from "../../cryptopunk.bitarith";

const E2_POLYNOMIAL = 0x11b;
const ROUNDS = 12;

let SBOX;

const V = Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef);

let K3, K4;

function multiply(a, b)
{
	let [a0, a1, a2, a3] = bytesToInt32sBE(a);
	const [b0, b1, b2, b3] = bytesToInt32sBE(b);
	a0 = mul(a0, b0 | 1);
	a1 = mul(a1, b1 | 1);
	a2 = mul(a2, b2 | 1);
	a3 = mul(a3, b3 | 1);

	int32sToBytesBE([a0, a1, a2, a3], a);
}

function div(a, b)
{
	let [a0, a1, a2, a3] = bytesToInt32sBE(a);
	const [b0, b1, b2, b3] = bytesToInt32sBE(b);
	a0 = mul(modInv32(b0 | 1), a0) & 0xffffffff;
	a1 = mul(modInv32(b1 | 1), a1) & 0xffffffff;
	a2 = mul(modInv32(b2 | 1), a2) & 0xffffffff;
	a3 = mul(modInv32(b3 | 1), a3) & 0xffffffff;

	int32sToBytesBE([a0, a1, a2, a3], a);
}

function swapLR(a)
{
	[a[0], a[8]] = [a[8], a[0]];
	[a[1], a[9]] = [a[9], a[1]];
	[a[2], a[10]] = [a[10], a[2]];
	[a[3], a[11]] = [a[11], a[3]];
	[a[4], a[12]] = [a[12], a[4]];
	[a[5], a[13]] = [a[13], a[5]];
	[a[6], a[14]] = [a[14], a[6]];
	[a[7], a[15]] = [a[15], a[7]];
}

// Initial transformation
function BP(a)
{
	
	let temp = a[1];
	a[1] = a[5];
	a[5] = a[9];
	a[9] = a[13];
	a[13] = temp;

	temp = a[15];
	a[15] = a[11];
	a[11] = a[7];
	a[7] = a[3];
	a[3] = temp;

	temp = a[2];
	a[2] = a[10];
	a[10] = temp;

	temp = a[6];
	a[6] = a[14];
	a[14] = temp;
}

function invBP(a)
{
	
	let temp = a[1];
	a[1] = a[13];
	a[13] = a[9];
	a[9] = a[5];
	a[5] = temp;

	temp = a[15];
	a[15] = a[3];
	a[3] = a[7];
	a[7] = a[11];
	a[11] = temp;

	temp = a[2];
	a[2] = a[10];
	a[10] = temp;

	temp = a[6];
	a[6] = a[14];
	a[14] = temp;
}

function P(a)
{
	a[7] ^= a[3];
	a[6] ^= a[2];
	a[5] ^= a[1];
	a[4] ^= a[0];

	a[3] ^= a[5];
	a[2] ^= a[4];
	a[1] ^= a[7];
	a[0] ^= a[6];

	a[7] ^= a[2];
	a[6] ^= a[1];
	a[5] ^= a[0];
	a[4] ^= a[3];

	a[3] ^= a[7];
	a[2] ^= a[6];
	a[1] ^= a[5];
	a[0] ^= a[4];
}

function S(a)
{
	for (let i = 0; i < a.length; i++)
	{
		a[i] = SBOX[a[i]];
	}
}

function F(a, key)
{
	xorBytes(a, key.subarray(0, 8));
	S(a);
	P(a);

	xorBytes(a, key.subarray(8, 16));
	S(a);
	// Byte Rotate Left:
	rolBytes(a, 8);
}

function G(x, v, y)
{
	for (let i = 0; i < 32; i += 8)
	{
		const xi = x.subarray(i, i + 8);
		S(xi);
		P(xi);
		
		S(v);
		P(v);
		xorBytes(v, xi);
		y.set(v, i);
	}
}

function precompute()
{
	if (SBOX)
	{
		return;
	}

	SBOX = new Uint8Array(256);

	for (let x = 0; x < 256; x++)
	{
		SBOX[x] = gfExp256(x, 127, E2_POLYNOMIAL) * 97 + 225;
	}

	K3 = Uint8Array.from(V);
	for (let i = 0; i < 3; i++)
	{
		S(K3);
	}
	K4 = Uint8Array.from(K3);
	S(K4);
}

class E2Transform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, [128, 192, 256]);

		const keys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 128, keys);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const state = Uint8Array.from(block);
		
		xorBytes(state, keys[ROUNDS]);

		multiply(state, keys[ROUNDS + 1]);
		BP(state);

		const temp = new Uint8Array(8);
		let left = state.subarray(0, 8);
		let right = state.subarray(8, 16);

		for (let r = 0; r < ROUNDS; r++)
		{
			temp.set(right);

			F(temp, keys[r]);
			xorBytes(left, temp);

			[left, right] = [right, left];
		}

		swapLR(state);

		invBP(state);

		div(state, keys[ROUNDS + 2]);
		xorBytes(state, keys[ROUNDS + 3]);

		dest.set(state, destOffset);
	}

	generateKeys(keyBytes)
	{
		const k = new Uint8Array(32);
		k.set(keyBytes);

		switch (keyBytes.length)
		{
			case 16:
				k.set(K3, 16);
				k.set(K4, 24);
				break;
			case 24:
				k.set(K4, 24);
				break;
			case 32:
				break;
		}

		const keys = new Array(ROUNDS + 4);
		for (let i = 0; i < keys.length; i++)
		{
			keys[i] = new Uint8Array(16);
		}
		const v = Uint8Array.from(V);

		const y = new Uint8Array(32);
		G(k, v, y);

		for (let i = 0; i < 8; i++)
		{
			G(k, v, y);

			let b = Math.floor(i / 2) * 4 + (i % 2) * 2;
			for (let half = 0; half < 2; half++)
			{
				for (let l = 0; l < 4; l++)
				{
					const s1 = half * 16 + l;
					const s2 = s1 + 8;
					const s3 = s1 + 4;
					const s4 = s1 + 12;
					keys[l * 2    ][b] = y[s1];
					keys[l * 2 + 1][b] = y[s2];
					keys[l * 2 + 8][b] = y[s3];
					keys[l * 2 + 9][b] = y[s4];
				}
				b++;
			}
		}

		return keys;
	}
}

class E2EncryptTransform extends E2Transform
{
	constructor()
	{
		super(false);
	}
}

class E2DecryptTransform extends E2Transform
{
	constructor()
	{
		super(true);
	}

	generateKeys(keyBytes)
	{
		let keys = super.generateKeys(keyBytes);
		
		// Reverse round keys and prewhitening keys separately:
		keys = keys.slice(0, ROUNDS).reverse().concat(keys.slice(ROUNDS).reverse());

		return keys;
	}
}

export {
	E2EncryptTransform,
	E2DecryptTransform
};
