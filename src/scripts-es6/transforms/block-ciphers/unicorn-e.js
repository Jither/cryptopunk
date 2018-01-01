import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { SBOX1, SBOX2, SBOX3, SBOX4, precomputeSboxes } from "./unicorn_shared";

const ROUNDS = 16;

let SBOXES;

const SH = [
	[0,2,1,3],
	[0,2,3,1],
	[0,3,1,2],
	[0,3,2,1],
	[1,0,3,2],
	[1,2,0,3],
	[1,3,0,2],
	[3,1,0,2],
	[3,2,1,0],
	[2,0,1,3],
	[2,0,3,1],
	[3,0,2,1],
	[1,3,2,0],
	[2,1,0,3],
	[2,1,3,0],
	[3,2,2,0]
];

function precompute()
{
	if (SBOXES)
	{
		return;
	}
	precomputeSboxes();
	SBOXES = [SBOX1, SBOX2, SBOX3, SBOX4];
}

function Tn(x, n)
{
	const xin = (x >>> ((3 - n) * 8)) & 0xff;
	const xout = new Array(4);
	xout[(n + 1) % 4] = SBOXES[0][xin];
	xout[(n + 2) % 4] = SBOXES[1][xin];
	xout[(n + 3) % 4] = SBOXES[2][xin];
	xout[ n         ] = SBOXES[3][xin] ^ xin; // XOR with xin to cancel it out below

	return (x ^ (xout[0] << 24) ^ (xout[1] << 16) ^ (xout[2] << 8) ^ (xout[3]));
}

function L(xl, xr, key)
{
	return [
		xl ^ (xr & key[1]) ^ (xl & key[0] & key[1]),
		xr ^ (xl & key[0]) ^ (xr & key[1] & key[0])
	];
}

function Y(x, s1, s2, s3)
{
	x += x << s1;
	x += x << s2;
	x += x << s3;
	return x & 0xffffffff;
}

function K(x, k, s)
{
	return x ^ (k << (24 - (s * 8)));
}

function F(x, fk, sk)
{
	let wx = (fk[0] + x) & 0xffffffff;

	let wk = (wx + sk[0]) & 0xffffffff;
	wk = Y(wk, 3, 8, 16);
	wk = Tn(wk, 0);
	wk = (wk + sk[1]) & 0xffffffff;
	wk = Y(wk, 7, 9, 13);
	wk = Tn(wk, 0);
	wk = Tn(wk, 1);

	const wk0 = wk >>> 28;
	const wk1 = wk & 0xff;
	const wk2 = (wk >>> 8) & 0xff;

	wx = Tn(wx, 0);
	wx = Tn(wx, 1);
	wx = Tn(wx, 2);
	wx = Tn(wx, 3);

	wx = (wx + fk[1]) & 0xffffffff;

	const sh = SH[wk0];
	wx = Tn(wx, sh[0]);
	wx = Tn(wx, sh[1]);
	wx = Tn(wx, sh[2]);
	wx = Tn(wx, sh[3]);

	wx = K(wx, wk1, sh[0]);
	wx = Tn(wx, sh[0]);
	wx = K(wx, wk2, sh[1]);
	wx = Tn(wx, sh[1]);

	return wx;
}

function ST(x, n)
{
	let x0 = x[0], x1 = x[1], x2 = x[2], x3 = x[3];

	const t0 = Tn(x3, n);
	const a0 = (x2 + t0) & 0xffffffff;
	const t1 = Tn(a0, (n + 1) % 4);
	const a1 = (x3 + t1) & 0xffffffff;
	x0 ^= a0;
	x1 ^= a1;

	const t2 = Tn(x1, (n + 2) % 4);
	const a2 = (x0 + t2) & 0xffffffff;
	const t3 = Tn(a2, (n + 3) % 4);
	const a3 = (x1 + t3) & 0xffffffff;
	x2 ^= a2;
	x3 ^= a3;

	x[0] = x0; x[1] = x1; x[2] = x2; x[3] = x3;

	return [t0, t1, t2, t3];
}

class UnicornETransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, [128]);

		const keys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 64, keys);
	}

	generateKeys(keyBytes)
	{
		const x = bytesToInt32sBE(keyBytes);

		for (let i = 0; i < 4; i++)
		{
			ST(x, i);
		}

		const ik = new Array(ROUNDS / 2 + 1);
		const fk = new Array(ROUNDS);
		const sk = new Array(ROUNDS);

		let ikIndex = 0, skIndex = 0, fkIndex = 0;

		function extractIK(k)
		{
			ik[ikIndex++] = [k[1], k[3]];
		}
		function extractSK(k)
		{
			sk[skIndex++] = [k[2], k[0]];
			sk[skIndex++] = [k[3], k[1]];
		}
		function extractFK(k)
		{
			fk[fkIndex++] = [k[2], k[0]];
			fk[fkIndex++] = [k[3], k[1]];
		}

		extractIK(ST(x, 0)); // IK 0
		extractSK(ST(x, 1)); // SK 0-1
		extractFK(ST(x, 2)); // FK 0-1

		extractIK(ST(x, 3)); // IK 1
		extractSK(ST(x, 0)); // SK 2-3
		extractFK(ST(x, 1)); // FK 2-3

		extractIK(ST(x, 2)); // IK 2
		extractSK(ST(x, 3)); // SK 4-5
		extractFK(ST(x, 0)); // FK 4-5

		extractIK(ST(x, 1)); // IK 3
		extractSK(ST(x, 2)); // SK 6-7

		const t1 = ST(x, 3);
		fk[fkIndex++] = [t1[0], x[0]]; // FK 6
		fk[fkIndex++] = [t1[1], x[1]]; // FK 7
		fk[fkIndex++] = [null , x[2]]; // FK 8 second half
		fk[fkIndex++] = [null , x[3]]; // FK 9 second half
		const t2 = ST(x, 0);
		ik[ikIndex++] = [t1[3], t2[1]]; // IK 4
		const t3 = ST(x, 1);
		sk[skIndex++] = [t3[0], t2[2]]; // SK 8
		sk[skIndex++] = [t3[1], t2[3]]; // SK 9
		fk[fkIndex - 2][0] = t3[2]; // FK 8 first half
		fk[fkIndex - 1][0] = t3[3]; // FK 9 first half

		extractIK(ST(x, 2)); // IK 5
		extractSK(ST(x, 3)); // SK 10-11
		extractFK(ST(x, 0)); // FK 10-11
		
		extractIK(ST(x, 1)); // IK 6
		extractSK(ST(x, 2)); // SK 12-13
		extractFK(ST(x, 3)); // FK 12-13

		extractIK(ST(x, 0)); // IK 7
		extractSK(ST(x, 1)); // SK 14-15
		extractFK(ST(x, 2)); // FK 14-15

		extractIK(ST(x, 3)); // IK 8

		return {
			ik,
			fk,
			sk
		};
	}
}

class UnicornEEncryptTransform extends UnicornETransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		let [left, right] = bytesToInt32sBE(block);

		const ik = keys.ik,
			fk = keys.fk,
			sk = keys.sk;

		[left, right] = L(left, right, ik[0]);

		for (let r = 0; r < ROUNDS; r += 2)
		{
			left ^= F(right, fk[r], sk[r]);
			right ^= F(left, fk[r + 1], sk[r + 1]);
			[left, right] = L(left, right, ik[r / 2 + 1]);
		}

		dest.set(int32sToBytesBE([left, right]), destOffset);
	}
}

class UnicornEDecryptTransform extends UnicornETransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		let [left, right] = bytesToInt32sBE(block);

		const ik = keys.ik,
			fk = keys.fk,
			sk = keys.sk;

		[left, right] = L(left, right, ik[0]);

		for (let r = 0; r < ROUNDS; r += 2)
		{
			// Decrypt: Reverse left/right order:
			right ^= F(left, fk[r], sk[r]);
			left ^= F(right, fk[r + 1], sk[r + 1]);
			[left, right] = L(left, right, ik[r / 2 + 1]);
		}

		dest.set(int32sToBytesBE([left, right]), destOffset);
	}

	generateKeys(keyBytes)
	{
		const keys = super.generateKeys(keyBytes);
		keys.ik.reverse();
		keys.fk.reverse();
		keys.sk.reverse();
		return keys;
	}
}

export {
	UnicornEEncryptTransform,
	UnicornEDecryptTransform
};