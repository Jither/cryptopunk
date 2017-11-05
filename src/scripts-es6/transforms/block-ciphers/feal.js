import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";

function S(x1, x2, i)
{
	const s = (x1 + x2 + i) & 0xff;
	return ((s << 2) | (s >> 6)) & 0xff;
}

function FEAL_F(a, b)
{
	const a0 = (a >>> 24) & 0xff;
	const a3 = a & 0xff;

	let f1 = ((a >>> 16) ^ (b >>> 8) ^ a0) & 0xff;
	let f2 = ((a >>>  8) ^  b        ^ a3) & 0xff;
	f1 = S(f1, f2, 1);
	f2 = S(f2, f1, 0);
	const f0 = S(a0, f1, 0);
	const f3 = S(a3, f2, 1);

	return (f0 << 24) | (f1 << 16) | (f2 << 8) | f3;
}

function FEAL_Fk(a, b) // eslint-disable-line camelcase
{
	let fk1 = ((a >>> 16) ^ (a >>> 24)) & 0xff;
	let fk2 = ((a >>>  8) ^ (a       )) & 0xff;

	fk1 = S(fk1, fk2 ^ (b >>> 24), 1);
	fk2 = S(fk2, fk1 ^ (b >>> 16), 0);
	const fk0 = S(a >>> 24, fk1 ^ (b >>> 8), 0);
	const fk3 = S(a, fk2 ^ (b), 1);

	return (fk0 << 24) | (fk1 << 16) | (fk2 << 8) | fk3;
}

class FealTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 32, { min: 2, step: 2 });
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, [64, 128]);

		if (this.options.rounds <= 0 || this.options.rounds % 2 !== 0)
		{
			throw new TransformError(`Number of rounds must be > 0 and even. Was: ${this.options.rounds}.`);
		}

		const key = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 64, key);
	}

	generateKeys(keyBytes)
	{
		const keyWords = bytesToInt32sBE(keyBytes);
		let a = keyWords[0];
		let b = keyWords[1];
		const kr1 = keyWords.length > 2 ? keyWords[2] : 0;
		const kr2 = keyWords.length > 2 ? keyWords[3] : 0;
		let d = 0;

		const qi = [kr1 ^ kr2, kr1, kr2];

		const keyCount = this.options.rounds + 8;
		const result = new Uint16Array(keyCount);

		for (let i = 0; i < keyCount; i++)
		{
			const q = qi[i % 3];
		
			const s = b ^ q ^ d;
			d = a;

			a = FEAL_Fk(a, s);
			result[i * 2] = a >>> 16;
			result[i * 2 + 1] = a & 0xffff;
			[a, b] = [b, a];
		}

		return result;
	}
}

class FealEncryptTransform extends FealTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, key)
	{
		const r = this.options.rounds;

		const p = bytesToInt32sBE(block);

		const keyPreA = (key[r] << 16 | key[r + 1]);
		const keyPreB = (key[r + 2] << 16 | key[r + 3]);
		let a = p[0] ^ keyPreA;
		let b = p[1] ^ keyPreB;

		b ^= a;
		
		for (let i = 0; i < r; i++)
		{
			const k = key[i];
			
			a ^=  FEAL_F(b, k);

			[a, b] = [b, a];
		}

		a ^= b;
		
		const keyPostB = key[r + 4] << 16 | key[r + 5];
		const keyPostA = key[r + 6] << 16 | key[r + 7];
		const c = int32sToBytesBE([b ^ keyPostB, a ^ keyPostA]);
		dest.set(c, destOffset);
	}
}

class FealDecryptTransform extends FealTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, key)
	{
		const r = this.options.rounds;

		const c = bytesToInt32sBE(block);

		const keyPostA = key[r + 6] << 16 | key[r + 7];
		const keyPostB = key[r + 4] << 16 | key[r + 5];

		let b = c[0] ^ keyPostB;
		let a = c[1] ^ keyPostA;

		a ^= b;
		
		for (let i = r - 1; i >= 0; i--)
		{
			const k = key[i];
			
			b ^=  FEAL_F(a, k);

			[a, b] = [b, a];
		}

		b ^= a;
		
		const keyPreA = (key[r] << 16 | key[r + 1]);
		const keyPreB = (key[r + 2] << 16 | key[r + 3]);

		const p = int32sToBytesBE([a ^ keyPreA, b ^ keyPreB]);
		dest.set(p, destOffset);
	}
}

export {
	FealEncryptTransform,
	FealDecryptTransform
};