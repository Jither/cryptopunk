import { checkSize, bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { rol } from "../../cryptopunk.bitarith";

function gimliPermutation(bytes)
{
	checkSize(bytes.length * 8, 384);
	const words = bytesToInt32sBE(bytes);

	for (let r = 24; r > 0; r--)
	{
		for (let j = 0; j < 4; j++)
		{
			const x = rol(words[j    ], 24);
			const y = rol(words[j + 4], 9);
			const z =     words[j + 8];

			words[j + 8] = x ^ (z << 1) ^ ((y & z) << 2);
			words[j + 4] = y ^ x ^ ((x | z) << 1);
			words[j    ] = z ^ y ^ ((x & y) << 3);
		}
		const mod = r % 4;
		if (mod === 0)
		{
			[words[0], words[1]] = [words[1], words[0]];
			[words[2], words[3]] = [words[3], words[2]];

			words[0] ^= 0x9e377900 ^ r;
		}
		else if (mod === 2)
		{
			[words[0], words[2]] = [words[2], words[0]];
			[words[1], words[3]] = [words[3], words[1]];
		}
	}

	int32sToBytesBE(words, bytes);
}

export {
	gimliPermutation
};
