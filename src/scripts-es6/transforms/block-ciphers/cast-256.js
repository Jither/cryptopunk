import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";
import { ROOTS } from "../shared/constants";
import { S1, S2, S3, S4 } from "./cast-128";

const ROUNDS = 12;

// S-boxes are identical to first four CAST-128 S-boxes

let TM, TR;

function precompute()
{
	if (TM)
	{
		return;
	}

	let cm = ROOTS.SQRT2_DIV4;
	let cr = 19;
	const mm = ROOTS.SQRT3_DIV4;
	const mr = 17;

	TM = new Array(ROUNDS * 2);
	TR = new Array(ROUNDS * 2);

	for (let i = 0; i < ROUNDS * 2; i++)
	{
		const tmi = TM[i] = new Array(8);
		const tri = TR[i] = new Array(8);
		for (let j = 0; j < 8; j++)
		{
			tmi[j] = cm;
			cm = add(cm, mm);
			tri[j] = cr;
			cr = (cr + mr) & 0x1f;
		}
	}
}

function f1(right, mask, rot)
{
	const i = rol(add(mask, right), rot),
		iA = i >>> 24,
		iB = (i >> 16) & 0xff,
		iC = (i >>  8) & 0xff,
		iD = i & 0xff;

	return add(S1[iA] ^ S2[iB], -S3[iC], S4[iD]);
}

function f2(right, mask, rot)
{
	const i = rol(mask ^ right, rot),
		iA = i >>> 24,
		iB = (i >> 16) & 0xff,
		iC = (i >>  8) & 0xff,
		iD = i & 0xff;

	return add(S1[iA], -S2[iB],  S3[iC]) ^ S4[iD];
}

function f3(right, mask, rot)
{
	const i = rol(add(mask, -right), rot),
		iA = i >>> 24,
		iB = (i >> 16) & 0xff,
		iC = (i >>  8) & 0xff,
		iD = i & 0xff;

	return add(add(S1[iA],  S2[iB]) ^ S3[iC], -S4[iD]);
}

function w(kappa, tmi, tri)
{
	kappa[6] ^= f1(kappa[7], tmi[0], tri[0]);
	kappa[5] ^= f2(kappa[6], tmi[1], tri[1]);
	kappa[4] ^= f3(kappa[5], tmi[2], tri[2]);
	kappa[3] ^= f1(kappa[4], tmi[3], tri[3]);
	kappa[2] ^= f2(kappa[3], tmi[4], tri[4]);
	kappa[1] ^= f3(kappa[2], tmi[5], tri[5]);
	kappa[0] ^= f1(kappa[1], tmi[6], tri[6]);
	kappa[7] ^= f2(kappa[0], tmi[7], tri[7]);
}

function q(beta, kmi, kri)
{
	beta[2] ^= f1(beta[3], kmi[0], kri[0]);
	beta[1] ^= f2(beta[2], kmi[1], kri[1]);
	beta[0] ^= f3(beta[1], kmi[2], kri[2]);
	beta[3] ^= f1(beta[0], kmi[3], kri[3]);
}

function qbar(beta, kmi, kri)
{
	beta[3] ^= f1(beta[0], kmi[3], kri[3]);
	beta[0] ^= f3(beta[1], kmi[2], kri[2]);
	beta[1] ^= f2(beta[2], kmi[1], kri[1]);
	beta[2] ^= f1(beta[3], kmi[0], kri[0]);
}

class Cast256Transform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, [128, 160, 192, 224, 256]);
		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	generateSubKeys(keyBytes)
	{
		precompute();

		const kappa = bytesToInt32sBE(keyBytes);
		// Pad kappa with 0's
		for (let i = kappa.length; i < 8; i++)
		{
			kappa.push(0);
		}

		const kRotate = new Array(ROUNDS * 2);
		const kMask = new Array(ROUNDS * 2);

		for (let i = 0; i < ROUNDS; i ++)
		{
			const tableIndex = i * 2;
			w(kappa, TM[tableIndex], TR[tableIndex]);
			w(kappa, TM[tableIndex + 1], TR[tableIndex + 1]);

			kRotate[i] = [
				kappa[0] & 0x1f,
				kappa[2] & 0x1f,
				kappa[4] & 0x1f,
				kappa[6] & 0x1f
			];
			kMask[i] = [
				kappa[7],
				kappa[5],
				kappa[3],
				kappa[1]
			];
		}

		return {
			kMask,
			kRotate
		};
	}
}

class Cast256EncryptTransform extends Cast256Transform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const beta = bytesToInt32sBE(block);

		const halfRounds = ROUNDS / 2;

		for (let i = 0; i < halfRounds; i++)
		{
			q(beta, subKeys.kMask[i], subKeys.kRotate[i]);
		}

		for (let i = halfRounds; i < ROUNDS; i++)
		{
			qbar(beta, subKeys.kMask[i], subKeys.kRotate[i]);
		}

		dest.set(int32sToBytesBE(beta), destOffset);
	}
}

class Cast256DecryptTransform extends Cast256Transform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const beta = bytesToInt32sBE(block);

		const halfRounds = ROUNDS / 2;

		for (let i = ROUNDS - 1; i >= halfRounds; i--)
		{
			q(beta, subKeys.kMask[i], subKeys.kRotate[i]);
		}

		for (let i = halfRounds - 1; i >= 0; i--)
		{
			qbar(beta, subKeys.kMask[i], subKeys.kRotate[i]);
		}

		dest.set(int32sToBytesBE(beta), destOffset);
	}
}

export {
	Cast256EncryptTransform,
	Cast256DecryptTransform
};