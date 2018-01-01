import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { mul } from "../../cryptopunk.bitarith";
import { SBOX1, SBOX2, SBOX3, SBOX4, precomputeSboxes } from "./unicorn_shared";

const C0 = 0x7e167289,
	C1 = 0xfe21464b;

const ROUNDS = 16;

function A3(x0, x1)
{
	const sa0 = (x0 << 23) | (x1 >>>  9);
	const sa1 = (x1 << 23) | (x0 >>>  9);
	const sb0 = (x1 <<  9) | (x0 >>> 23);
	const sb1 = (x0 <<  9) | (x1 >>> 23);

	return [(x0 ^ sa0 ^ sb0), (x1 ^ sa1 ^ sb1)];
}

function Tn(x, n)
{
	x = (x >>> ((3 - n) * 8)) & 0xff;
	return (SBOX1[x] << 24) | (SBOX2[x] << 16) | (SBOX3[x] << 8) | SBOX4[x];
}

function MT(x0, x1)
{
	const y0 = mul(x0, 0x01010101);
	const y1 = x1 ^ Tn(y0, 0);
	return [y0, y1];
}

function F(xl, xr, fk, sk)
{
	let wk0 = (sk[0] + xr) & 0xffffffff;
	let wk1 = (sk[1] + xl) & 0xffffffff;

	wk0 = mul(wk0, C0);
	wk1 ^= Tn(wk0, 0);
	wk1 = mul(wk1, C1);
	wk0 ^= Tn(wk1, 0);
	wk0 = mul(wk0, C1);
	wk1 ^= Tn(wk0, 0);
	wk1 = mul(wk1, C0);

	wk0 ^= Tn(wk1, 0);
	wk1 ^= Tn(wk0, 1);
	wk0 ^= Tn(wk1, 1);

	let wx0 = (fk[0] + xl);
	let wx1 = (fk[1] + xr);
	[wx0, wx1] = A3(wx0, wx1);
	wx0 = mul(wx0, C0);
	wx1 ^= Tn(wx0, 0);
	wx1 = mul(wx1, C1);
	wx0 ^= Tn(wx1, 0);
	
	wx1 ^= Tn(wx0, 1);
	wx0 ^= Tn(wx1, 1);
	
	wx1 ^= Tn(wx0, 2);
	wx0 ^= Tn(wx1, 2);

	wx1 ^= Tn(wx0, 3);
	wx0 ^= Tn(wx1, 3);

	let k = (wk1 >>> 2) & 0x03;
	wx1 ^= Tn(wx0, k);
	k = wk1 & 0x03;
	wx0 ^= Tn(wx1, k);
	return [wx0 ^ wk0, wx1 ^ wk0];
}

class UnicornATransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precomputeSboxes();

		this.checkBytesSize("Key", keyBytes, [128, 192, 256]);

		const keys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 128, keys);
	}

	generateKeys(keyBytes)
	{
		const rkCount = ROUNDS + 2;
		const ksRounds = rkCount / 2;

		const w = bytesToInt32sBE(keyBytes);
		const wk = new Array(ksRounds * 8);

		const line = w.length;

		for (let i = 0; i < 3; i++)
		{
			for (let j = 0; j < line; j++)
			{
				const j2 = (j + 1) % line;
				[w[j], w[j2]] = MT(w[j], w[j2]);
			}
		}

		let count = 0;
		for (let i = 0; i < ksRounds; i++)
		{
			const part1 = i * 16;
			const part2 = part1 + 8;
			const end = part2 + 8;
			for (let j = part1; j < part2; j++)
			{
				const j1 = j % line;
				const j2 = (j + 1) % line;
				[w[j1], w[j2]] = MT(w[j1], w[j2]);
			}
			for (let j = part2; j < end; j++)
			{
				const j1 = j % line;
				const j2 = (j + 1) % line;
				[w[j1], w[j2]] = MT(w[j1], w[j2]);
				wk[count++] = w[j2];
			}
		}

		const ik = new Array(8);
		ik[0] = wk[0];
		ik[1] = wk[rkCount];
		ik[2] = wk[rkCount * 2];
		ik[3] = wk[rkCount * 3];
		ik[4] = wk[rkCount - 1];
		ik[5] = wk[rkCount * 2 - 1];
		ik[6] = wk[rkCount * 3 - 1];
		ik[7] = wk[rkCount * 4 - 1];

		const fk = new Array(ROUNDS);
		const sk = new Array(ROUNDS);
		for (let i = 0; i < ROUNDS; i++)
		{
			fk[i] = [wk[          1 + i], wk[rkCount * 2 + 1 + i]];
			sk[i] = [wk[rkCount + 1 + i], wk[rkCount * 3 + 1 + i]];
		}

		return {
			ik,
			fk,
			sk
		};
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const w = bytesToInt32sBE(block);
		const ik = keys.ik;
		const fk = keys.fk;
		const sk = keys.sk;

		for (let i = 0; i < 4; i++)
		{
			w[i] = (w[i] + ik[i]);
		}

		let f;
		for (let r = 0; r < ROUNDS - 1; r++)
		{
			f = F(w[2], w[3], fk[r], sk[r]);

			[w[0], w[1], w[2], w[3]] = [
				w[2], 
				w[3], 
				w[0] ^ f[0], 
				w[1] ^ f[1]
			];
		}

		f = F(w[2], w[3], fk[ROUNDS - 1], sk[ROUNDS - 1]);
		[w[0], w[1]] = [w[0] ^ f[0], w[1] ^ f[1]];

		for (let i = 0; i < 4; i++)
		{
			w[i] = (w[i] - ik[i + 4]) & 0xffffffff;
		}

		dest.set(int32sToBytesBE(w), destOffset);
	}
}

class UnicornAEncryptTransform extends UnicornATransform
{
	constructor()
	{
		super(false);
	}
}

class UnicornADecryptTransform extends UnicornATransform
{
	constructor()
	{
		super(true);
	}

	generateKeys(keyBytes)
	{
		const keys = super.generateKeys(keyBytes);
		const ik = keys.ik;
		// Swap whitening keys:
		[ik[0], ik[1], ik[2], ik[3], ik[4], ik[5], ik[6], ik[7]] = [ik[4], ik[5], ik[6], ik[7], ik[0], ik[1], ik[2], ik[3]];
		// ... and reverse the rest:
		keys.fk.reverse();
		keys.sk.reverse();
		return keys;
	}
}

export {
	UnicornAEncryptTransform,
	UnicornADecryptTransform
};