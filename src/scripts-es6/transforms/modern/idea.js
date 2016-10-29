import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";

const ROUNDS = 8;

function mulInv(x)
{
	if (x <= 1)
	{
		return x;
	}
	let y = 0x10001;
	let t0 = 1;
	let t1 = 0;

	for (;;)
	{
		t1 += Math.floor(y / x) * t0;
		y %= x;
		if (y === 1)
		{
			return 0x10001 - t1;
		}
		t0 += Math.floor(x / y) * t1;
		x %= y;
		if (x === 1)
		{
			return t0;
		}
	}
}

function add(a, b)
{
	return (a + b) & 0xffff;
}

function addInv(x)
{
	return (0x10000 - x) & 0xffff;
}

function mul(a, b)
{
	const r = a * b;
	if (r === 0)
	{
		return (1 - a - b) & 0xffff;
	}
	return (r % 0x10001) & 0xffff;
}

class IdeaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 128)

		let subKeys = this.generateSubKeys(keyBytes);

		if (this.decrypt)
		{
			subKeys = this.invertSubKeys(subKeys);
		}

		return this.transformBlocks(bytes, 64, subKeys);
	}

	transformBlock(block, dest, destIndex, subKeys)
	{
		let x0 = (block[0] << 8) | block[1];
		let x1 = (block[2] << 8) | block[3];
		let x2 = (block[4] << 8) | block[5];
		let x3 = (block[6] << 8) | block[7];

		let p = 0;
		for (let r = 0; r < ROUNDS; r++)
		{
			const y0 = mul(x0, subKeys[p++]);
			const y1 = add(x1, subKeys[p++]);
			const y2 = add(x2, subKeys[p++]);
			const y3 = mul(x3, subKeys[p++]);

			const t0 = mul(y0 ^ y2, subKeys[p++]);
			const t1 = add(y1 ^ y3, t0);
			const t2 = mul(t1, subKeys[p++]);
			const t3 = add(t0, t2);

			x0 = y0 ^ t2;
			x1 = y2 ^ t2;
			x2 = y1 ^ t3;
			x3 = y3 ^ t3;
		}

		const r0 = mul(x0, subKeys[p++]);
		const r1 = add(x2, subKeys[p++]);
		const r2 = add(x1, subKeys[p++]);
		const r3 = mul(x3, subKeys[p++]);

		dest[destIndex++] = r0 >> 8;
		dest[destIndex++] = r0 & 0xff;
		dest[destIndex++] = r1 >> 8;
		dest[destIndex++] = r1 & 0xff;
		dest[destIndex++] = r2 >> 8;
		dest[destIndex++] = r2 & 0xff;
		dest[destIndex++] = r3 >> 8;
		dest[destIndex++] = r3 & 0xff;
	}

	invertSubKeys(subKeys)
	{
		const result = [];
		let p = 0;
		let i = ROUNDS * 6;
		result[i + 0] = mulInv(subKeys[p++]);
		result[i + 1] = addInv(subKeys[p++]);
		result[i + 2] = addInv(subKeys[p++]);
		result[i + 3] = mulInv(subKeys[p++]);

		for (let r = ROUNDS - 1; r >= 0; r--)
		{
			i = r * 6;
			const m = r > 0 ? 2 : 1;
			const n = r > 0 ? 1 : 2;
			result[i + 4] = subKeys[p++];
			result[i + 5] = subKeys[p++];
			result[i    ] = mulInv(subKeys[p++]);
			result[i + m] = addInv(subKeys[p++]);
			result[i + n] = addInv(subKeys[p++]);
			result[i + 3] = mulInv(subKeys[p++]);
		}

		return result;
	}

	generateSubKeys(keyBytes)
	{
		const result = new Array(ROUNDS * 6 + 4);
		for (let i = 0; i < 8; i++)
		{
			result[i] = (keyBytes[2 * i] << 8) | (keyBytes[2 * i + 1]);
		}
		for (let i = 8; i < result.length; i++)
		{
			const index1 = ((i + 1) % 8) ? i - 7 : i - 15;
			const index2 = ((i + 2) % 8) < 2 ? i - 14 : i - 6;
			result[i] = ((result[index1] << 9) | (result[index2] >> 7)) & 0xffff;
		}
		return result;
	}
}

class IdeaEncryptTransform extends IdeaTransform
{
	constructor()
	{
		super(false);
	}
}

class IdeaDecryptTransform extends IdeaTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	IdeaEncryptTransform,
	IdeaDecryptTransform
};