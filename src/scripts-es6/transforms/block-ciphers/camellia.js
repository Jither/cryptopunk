import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt64sBE, int64sToBytesBE } from "../../cryptopunk.utils";
import { rol, not64, xor64, ZERO_64 } from "../../cryptopunk.bitarith";

const
	SIGMA1 = { hi: 0xa09e667f, lo: 0x3bcc908b },
	SIGMA2 = { hi: 0xb67ae858, lo: 0x4caa73b2 },
	SIGMA3 = { hi: 0xc6ef372f, lo: 0xe94f82be },
	SIGMA4 = { hi: 0x54ff53a5, lo: 0xf1d36f1c },
	SIGMA5 = { hi: 0x10e527fa, lo: 0xde682d1d },
	SIGMA6 = { hi: 0xb05688c2, lo: 0xb3e6c1fd };

const SBOX1 = [
	0x70, 0x82, 0x2c, 0xec, 0xb3, 0x27, 0xc0, 0xe5, 0xe4, 0x85, 0x57, 0x35, 0xea, 0x0c, 0xae, 0x41, 
	0x23, 0xef, 0x6b, 0x93, 0x45, 0x19, 0xa5, 0x21, 0xed, 0x0e, 0x4f, 0x4e, 0x1d, 0x65, 0x92, 0xbd, 
	0x86, 0xb8, 0xaf, 0x8f, 0x7c, 0xeb, 0x1f, 0xce, 0x3e, 0x30, 0xdc, 0x5f, 0x5e, 0xc5, 0x0b, 0x1a, 
	0xa6, 0xe1, 0x39, 0xca, 0xd5, 0x47, 0x5d, 0x3d, 0xd9, 0x01, 0x5a, 0xd6, 0x51, 0x56, 0x6c, 0x4d, 
	0x8b, 0x0d, 0x9a, 0x66, 0xfb, 0xcc, 0xb0, 0x2d, 0x74, 0x12, 0x2b, 0x20, 0xf0, 0xb1, 0x84, 0x99, 
	0xdf, 0x4c, 0xcb, 0xc2, 0x34, 0x7e, 0x76, 0x05, 0x6d, 0xb7, 0xa9, 0x31, 0xd1, 0x17, 0x04, 0xd7, 
	0x14, 0x58, 0x3a, 0x61, 0xde, 0x1b, 0x11, 0x1c, 0x32, 0x0f, 0x9c, 0x16, 0x53, 0x18, 0xf2, 0x22, 
	0xfe, 0x44, 0xcf, 0xb2, 0xc3, 0xb5, 0x7a, 0x91, 0x24, 0x08, 0xe8, 0xa8, 0x60, 0xfc, 0x69, 0x50, 
	0xaa, 0xd0, 0xa0, 0x7d, 0xa1, 0x89, 0x62, 0x97, 0x54, 0x5b, 0x1e, 0x95, 0xe0, 0xff, 0x64, 0xd2, 
	0x10, 0xc4, 0x00, 0x48, 0xa3, 0xf7, 0x75, 0xdb, 0x8a, 0x03, 0xe6, 0xda, 0x09, 0x3f, 0xdd, 0x94, 
	0x87, 0x5c, 0x83, 0x02, 0xcd, 0x4a, 0x90, 0x33, 0x73, 0x67, 0xf6, 0xf3, 0x9d, 0x7f, 0xbf, 0xe2, 
	0x52, 0x9b, 0xd8, 0x26, 0xc8, 0x37, 0xc6, 0x3b, 0x81, 0x96, 0x6f, 0x4b, 0x13, 0xbe, 0x63, 0x2e, 
	0xe9, 0x79, 0xa7, 0x8c, 0x9f, 0x6e, 0xbc, 0x8e, 0x29, 0xf5, 0xf9, 0xb6, 0x2f, 0xfd, 0xb4, 0x59, 
	0x78, 0x98, 0x06, 0x6a, 0xe7, 0x46, 0x71, 0xba, 0xd4, 0x25, 0xab, 0x42, 0x88, 0xa2, 0x8d, 0xfa, 
	0x72, 0x07, 0xb9, 0x55, 0xf8, 0xee, 0xac, 0x0a, 0x36, 0x49, 0x2a, 0x68, 0x3c, 0x38, 0xf1, 0xa4, 
	0x40, 0x28, 0xd3, 0x7b, 0xbb, 0xc9, 0x43, 0xc1, 0x15, 0xe3, 0xad, 0xf4, 0x77, 0xc7, 0x80, 0x9e
];

let SBOX2, SBOX3, SBOX4;

function precompute()
{
	if (SBOX2)
	{
		return;
	}

	SBOX2 = SBOX1.map(s => ((s << 1) | (s >>> 7)) & 0xff);
	SBOX3 = SBOX1.map(s => ((s << 7) | (s >>> 1)) & 0xff);

	SBOX4 = new Array(256);
	for (let x = 0; x < 256; x++)
	{
		const x1 = ((x << 1) | (x >>> 7)) & 0xff;
		SBOX4[x] = SBOX1[x1];
	}
}

function rol128(a64, a00, count)
{
	let x96, x64, x32, x00;
	if (count >= 96)
	{
		x96 = a00.lo;
		x00 = a00.hi;
		x32 = a64.lo;
		x64 = a64.hi;
		count -= 96;
	}
	else if (count >= 64)
	{
		x64 = a00.lo;
		x96 = a00.hi;
		x00 = a64.lo;
		x32 = a64.hi;
		count -= 64;
	}
	else if (count >= 32)
	{
		x32 = a00.lo;
		x64 = a00.hi;
		x96 = a64.lo;
		x00 = a64.hi;
		count -= 32;
	}
	else
	{
		x00 = a00.lo;
		x32 = a00.hi;
		x64 = a64.lo;
		x96 = a64.hi;
	}

	const r00 = {
		lo: (x00 << count) | (x96 >>> (32 - count)),
		hi: (x32 << count) | (x00 >>> (32 - count))
	};
	const r64 = {
		lo: (x64 << count) | (x32 >>> (32 - count)),
		hi: (x96 << count) | (x64 >>> (32 - count))
	};

	return [r64, r00];
}

function f(fIn, ke)
{
	const x = xor64(fIn, ke);
	const
		t1 = SBOX1[ x.hi >>> 24],
		t2 = SBOX2[(x.hi >>  16) & 0xff],
		t3 = SBOX3[(x.hi >>   8) & 0xff],
		t4 = SBOX4[ x.hi         & 0xff],
		t5 = SBOX2[ x.lo >>> 24],
		t6 = SBOX3[(x.lo >>  16) & 0xff],
		t7 = SBOX4[(x.lo >>   8) & 0xff],
		t8 = SBOX1[ x.lo         & 0xff];

	const
		y1 = t1 ^ t3 ^ t4 ^ t6 ^ t7 ^ t8,
		y2 = t1 ^ t2 ^ t4 ^ t5 ^ t7 ^ t8,
		y3 = t1 ^ t2 ^ t3 ^ t5 ^ t6 ^ t8,
		y4 = t2 ^ t3 ^ t4 ^ t5 ^ t6 ^ t7,
		y5 = t1 ^ t2 ^ t6 ^ t7 ^ t8,
		y6 = t2 ^ t3 ^ t5 ^ t7 ^ t8,
		y7 = t3 ^ t4 ^ t5 ^ t6 ^ t8,
		y8 = t1 ^ t4 ^ t5 ^ t6 ^ t7;

	const result = {
		hi: (y1 << 24) | (y2 << 16) | (y3 << 8) | y4,
		lo: (y5 << 24) | (y6 << 16) | (y7 << 8) | y8
	};

	return result;
}

function fl(flIn, ke)
{
	const
		k1 = ke.hi,
		k2 = ke.lo;

	let x1 = flIn.hi,
		x2 = flIn.lo;
	
	x2 ^= rol(x1 & k1, 1);
	x1 ^= (x2 | k2);

	return { hi: x1, lo: x2 };
}

function flInv(flInvIn, ke)
{
	const
		k1 = ke.hi,
		k2 = ke.lo;

	let y1 = flInvIn.hi,
		y2 = flInvIn.lo;
	
	y1 ^= (y2 | k2);
	y2 ^= rol(y1 & k1, 1);

	return { hi: y1, lo: y2 };
}

class CamelliaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, [128, 192, 256]);

		precompute();

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys, keyBytes.length);
	}

	generateSubKeys(keyBytes)
	{
		const keyLength = keyBytes.length;
		let kl64, kl00, kr64, kr00;
		switch (keyLength)
		{
			case 16:
				[kl64, kl00] = bytesToInt64sBE(keyBytes);
				kr64 = ZERO_64;
				kr00 = ZERO_64;
				break;
			case 24:
				[kl64, kl00, kr64] = bytesToInt64sBE(keyBytes);
				kr00 = not64(kr64);
				break;
			case 32:
				[kl64, kl00, kr64, kr00] = bytesToInt64sBE(keyBytes);
				break;
		}

		let d1 = xor64(kl64, kr64);
		let d2 = xor64(kl00, kr00);
		d2 = xor64(d2, f(d1, SIGMA1));
		d1 = xor64(d1, f(d2, SIGMA2));
		d1 = xor64(d1, kl64);
		d2 = xor64(d2, kl00);
		d2 = xor64(d2, f(d1, SIGMA3));
		d1 = xor64(d1, f(d2, SIGMA4));

		const ka64 = { hi: d1.hi, lo: d1.lo };
		const ka00 = { hi: d2.hi, lo: d2.lo };

		if (keyLength === 16)
		{
			return this.generateSubKeys128(kl64, kl00, kr64, kr00, ka64, ka00);
		}

		d1 = xor64(ka64, kr64);
		d2 = xor64(ka00, kr00);
		d2 = xor64(d2, f(d1, SIGMA5));
		d1 = xor64(d1, f(d2, SIGMA6));

		const kb64 = { hi: d1.hi, lo: d1.lo };
		const kb00 = { hi: d2.hi, lo: d2.lo };

		return this.generateSubKeys256(kl64, kl00, kr64, kr00, ka64, ka00, kb64, kb00);
	}

	generateSubKeys128(kl64, kl00, kr64, kr00, ka64, ka00)
	{
		const kw = new Array(4);
		const k = new Array(18);
		const ke = new Array(4);

		kw[0] = kl64;
		kw[1] = kl00;
		k[ 0] = ka64;
		k[ 1] = ka00;
		[k[ 2], k[ 3]] = rol128(kl64, kl00, 15);
		[k[ 4], k[ 5]] = rol128(ka64, ka00, 15);
		[ke[0], ke[1]] = rol128(ka64, ka00, 30);
		[k[ 6], k[ 7]] = rol128(kl64, kl00, 45);
		[k[ 8]       ] = rol128(ka64, ka00, 45);
		[     , k[ 9]] = rol128(kl64, kl00, 60);
		[k[10], k[11]] = rol128(ka64, ka00, 60);
		[ke[2], ke[3]] = rol128(kl64, kl00, 77);
		[k[12], k[13]] = rol128(kl64, kl00, 94);
		[k[14], k[15]] = rol128(ka64, ka00, 94);
		[k[16], k[17]] = rol128(kl64, kl00, 111);
		[kw[2], kw[3]] = rol128(ka64, ka00, 111);

		return { k, kw, ke };
	}

	generateSubKeys256(kl64, kl00, kr64, kr00, ka64, ka00, kb64, kb00)
	{
		const kw = new Array(4);
		const k = new Array(24);
		const ke = new Array(6);

		kw[0] = kl64;
		kw[1] = kl00;
		k[ 0] = kb64;
		k[ 1] = kb00;
		[k[ 2], k[ 3]] = rol128(kr64, kr00, 15);
		[k[ 4], k[ 5]] = rol128(ka64, ka00, 15);
		[ke[0], ke[1]] = rol128(kr64, kr00, 30);
		[k[ 6], k[ 7]] = rol128(kb64, kb00, 30);
		[k[ 8], k[ 9]] = rol128(kl64, kl00, 45);
		[k[10], k[11]] = rol128(ka64, ka00, 45);
		[ke[2], ke[3]] = rol128(kl64, kl00, 60);
		[k[12], k[13]] = rol128(kr64, kr00, 60);
		[k[14], k[15]] = rol128(kb64, kb00, 60);
		[k[16], k[17]] = rol128(kl64, kl00, 77);
		[ke[4], ke[5]] = rol128(ka64, ka00, 77);
		[k[18], k[19]] = rol128(kr64, kr00, 94);
		[k[20], k[21]] = rol128(ka64, ka00, 94);
		[k[22], k[23]] = rol128(kl64, kl00, 111);
		[kw[2], kw[3]] = rol128(kb64, kb00, 111);

		return { k, kw, ke };
	}
}

class CamelliaEncryptTransform extends CamelliaTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys, keyLength)
	{
		const k = subKeys.k;
		const kw = subKeys.kw;
		const ke = subKeys.ke;

		let [d1, d2] = bytesToInt64sBE(block);

		// Pre whitening:
		d1 = xor64(d1, kw[0]);
		d2 = xor64(d2, kw[1]);

		// Round 1-6
		d2 = xor64(d2, f(d1, k[ 0]));
		d1 = xor64(d1, f(d2, k[ 1]));
		d2 = xor64(d2, f(d1, k[ 2]));
		d1 = xor64(d1, f(d2, k[ 3]));
		d2 = xor64(d2, f(d1, k[ 4]));
		d1 = xor64(d1, f(d2, k[ 5]));

		d1 = fl(d1, ke[0]);
		d2 = flInv(d2, ke[1]);

		// Round 7-12
		d2 = xor64(d2, f(d1, k[ 6]));
		d1 = xor64(d1, f(d2, k[ 7]));
		d2 = xor64(d2, f(d1, k[ 8]));
		d1 = xor64(d1, f(d2, k[ 9]));
		d2 = xor64(d2, f(d1, k[10]));
		d1 = xor64(d1, f(d2, k[11]));

		d1 = fl(d1, ke[2]);
		d2 = flInv(d2, ke[3]);

		// Round 13-18
		d2 = xor64(d2, f(d1, k[12]));
		d1 = xor64(d1, f(d2, k[13]));
		d2 = xor64(d2, f(d1, k[14]));
		d1 = xor64(d1, f(d2, k[15]));
		d2 = xor64(d2, f(d1, k[16]));
		d1 = xor64(d1, f(d2, k[17]));

		if (keyLength > 16)
		{
			d1 = fl(d1, ke[4]);
			d2 = flInv(d2, ke[5]);

			// Round 19-24
			d2 = xor64(d2, f(d1, k[18]));
			d1 = xor64(d1, f(d2, k[19]));
			d2 = xor64(d2, f(d1, k[20]));
			d1 = xor64(d1, f(d2, k[21]));
			d2 = xor64(d2, f(d1, k[22]));
			d1 = xor64(d1, f(d2, k[23]));
		}

		// Post whitening:
		d2 = xor64(d2, kw[2]);
		d1 = xor64(d1, kw[3]);

		dest.set(int64sToBytesBE([d2, d1]), destOffset);
	}
}

class CamelliaDecryptTransform extends CamelliaTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys, keyLength)
	{
		const k = subKeys.k;
		const kw = subKeys.kw;
		const ke = subKeys.ke;

		let [d1, d2] = bytesToInt64sBE(block);

		// Pre whitening:
		d1 = xor64(d1, kw[2]);
		d2 = xor64(d2, kw[3]);

		if (keyLength > 16)
		{
			// Round 24-19
			d2 = xor64(d2, f(d1, k[23]));
			d1 = xor64(d1, f(d2, k[22]));
			d2 = xor64(d2, f(d1, k[21]));
			d1 = xor64(d1, f(d2, k[20]));
			d2 = xor64(d2, f(d1, k[19]));
			d1 = xor64(d1, f(d2, k[18]));

			d1 = fl(d1, ke[5]);
			d2 = flInv(d2, ke[4]);
		}

		// Round 18-13
		d2 = xor64(d2, f(d1, k[17]));
		d1 = xor64(d1, f(d2, k[16]));
		d2 = xor64(d2, f(d1, k[15]));
		d1 = xor64(d1, f(d2, k[14]));
		d2 = xor64(d2, f(d1, k[13]));
		d1 = xor64(d1, f(d2, k[12]));

		d1 = fl(d1, ke[3]);
		d2 = flInv(d2, ke[2]);

		// Round 12-7
		d2 = xor64(d2, f(d1, k[11]));
		d1 = xor64(d1, f(d2, k[10]));
		d2 = xor64(d2, f(d1, k[ 9]));
		d1 = xor64(d1, f(d2, k[ 8]));
		d2 = xor64(d2, f(d1, k[ 7]));
		d1 = xor64(d1, f(d2, k[ 6]));

		d1 = fl(d1, ke[1]);
		d2 = flInv(d2, ke[0]);

		// Round 6-1
		d2 = xor64(d2, f(d1, k[ 5]));
		d1 = xor64(d1, f(d2, k[ 4]));
		d2 = xor64(d2, f(d1, k[ 3]));
		d1 = xor64(d1, f(d2, k[ 2]));
		d2 = xor64(d2, f(d1, k[ 1]));
		d1 = xor64(d1, f(d2, k[ 0]));

		// Post whitening:
		d2 = xor64(d2, kw[0]);
		d1 = xor64(d1, kw[1]);

		dest.set(int64sToBytesBE([d2, d1]), destOffset);
	}
}

export {
	CamelliaEncryptTransform,
	CamelliaDecryptTransform
};