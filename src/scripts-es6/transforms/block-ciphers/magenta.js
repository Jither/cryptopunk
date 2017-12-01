import { BlockCipherTransform } from "./block-cipher";
import { gfLog2Tables } from "../../cryptopunk.math";
import { xorBytes } from "../../cryptopunk.bitarith";

// TODO: Cleanup

let EXP;

function precompute()
{
	if (EXP)
	{
		return;
	}

	[, EXP] = gfLog2Tables(0x165);
	EXP[255] = 0;
}

// Π function
function pi(x, y)
{
	for (let i = 0; i < 8; i++)
	{
		const xi = x[i];
		const xi8 = x[i + 8];
		y[i * 2    ] = EXP[xi  ^ EXP[xi8]];
		y[i * 2 + 1] = EXP[xi8 ^ EXP[xi ]];
	}
}

function e(x, rounds)
{
	let right = new Uint8Array(16);
	let left = new Uint8Array(16);
	for (let r = 0; r < rounds; r++)
	{
		xorBytes(left, x);
		for (let i = 0; i < 3; i++)
		{
			pi(left, right);
			[left, right] = [right, left];
		}
		pi(left, right);
		
		for (let i = 0; i < 8; i++)
		{
			left[i] = right[i * 2];
			left[i + 8] = right[i * 2 + 1];
		}
	}

	x.set(left);
}

class MagentaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precompute();
		this.checkBytesSize("Key", keyBytes, [128, 192, 256]);

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const temp = new Uint8Array(16);
		let left = Uint8Array.from(block.subarray(0, 8));
		let right = Uint8Array.from(block.subarray(8, 16));
		if (this.decrypt)
		{
			[left, right] = [right, left];
		}

		for (let r = 0; r < subKeys.length; r++)
		{
			temp.set(right);
			temp.set(subKeys[r], 8);
			e(temp, 3);
			xorBytes(left, temp.subarray(0, 8));
			[left, right] = [right, left];
		}

		if (this.decrypt)
		{
			[left, right] = [right, left];
		}

		dest.set(left);
		dest.set(right, 8);
	}

	generateSubKeys(keyBytes)
	{
		const k = [];
		for (let i = 0; i < keyBytes.length / 8; i++)
		{
			k[i] = keyBytes.subarray(i * 8, i * 8 + 8);
		}
		switch (k.length)
		{
			case 2:
				return [k[0], k[0], k[1], k[1], k[0], k[0]];
			case 3:
				return [k[0], k[1], k[2], k[2], k[1], k[0]];
			case 4:
				return [k[0], k[1], k[2], k[3], k[3], k[2], k[1], k[0]];
			default:
				throw new Error("Unsupported key length");
		}
	}
}

class MagentaEncryptTransform extends MagentaTransform
{
	constructor()
	{
		super(false);
	}
}

class MagentaDecryptTransform extends MagentaTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	MagentaEncryptTransform,
	MagentaDecryptTransform
};