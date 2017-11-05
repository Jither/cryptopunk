import { BlockCipherTransform } from "./block-cipher";
import { rol16, ror16, rorBytes, rolBytes, xorBytes } from "../../cryptopunk.bitarith";

const KEY_HASH = Uint8Array.of(0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78);

class MadrygaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 64);
		const key = Uint8Array.from(keyBytes);
		return this.transformBlocks(bytes, 64, key);
	}
}

class MadrygaEncryptTransform extends MadrygaTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, key)
	{
		const length = block.length;
		const o1 = length - 2;
		const o2 = length - 1;
		const o3 = length;

		const state = Uint8Array.from(block);

		for (let i = 0; i < 8; i++)
		{
			for (let j = 0; j < length; j++)
			{
				const p1 = (j + o1) % length;
				const p2 = (j + o2) % length;
				const p3 = (j + o3) % length;
				let wf1 = state[p1];
				let wf2 = state[p2];
				let wf3 = state[p3];
				
				// Schneier vs. Shirriff/Biryukov/Kushilevitz: Disagreement about order of XOR vs. rotation, as well as direction of rotation
				rorBytes(key, 3);
				xorBytes(key, KEY_HASH);
				
				const rot = wf3 & 0b111;
				wf3 ^= key[7];
				const rotated = rol16(wf1 << 8 | wf2, rot);
				wf1 = rotated & 0xff;
				wf2 = (rotated >> 8 & 0xff);

				state[p1] = wf1;
				state[p2] = wf2;
				state[p3] = wf3;
			}
		}

		dest.set(state, destOffset);
	}
}

class MadrygaDecryptTransform extends MadrygaTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, key)
	{
		const length = block.length;
		const o1 = length - 2;
		const o2 = length - 1;
		const o3 = length;

		const state = Uint8Array.from(block);

		for (let i = 0; i < 8; i++)
		{
			for (let j = length - 1; j >= 0; j--)
			{
				const p1 = (j + o1) % length;
				const p2 = (j + o2) % length;
				const p3 = (j + o3) % length;
				let wf1 = state[p1];
				let wf2 = state[p2];
				let wf3 = state[p3];

				wf3 ^= key[7];
				xorBytes(key, KEY_HASH);
				rolBytes(key, 3);
				
				const rot = wf3 & 0b111;
				const rotated = ror16(wf1 << 8 | wf2, rot);
				wf1 = rotated & 0xff;
				wf2 = (rotated >> 8 & 0xff);

				state[p1] = wf1;
				state[p2] = wf2;
				state[p3] = wf3;
			}
		}

		dest.set(state, destOffset);
	}
}

export {
	MadrygaEncryptTransform,
	MadrygaDecryptTransform
};