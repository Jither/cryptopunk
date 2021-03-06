import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesBE, bytesToInt32sBE } from "../../cryptopunk.utils";
import { rol, ror } from "../../cryptopunk.bitarith";
import { SBOX_ENC, SBOX_DEC } from "./shark-square_shared";
import { gfLog2Tables256 } from "../../cryptopunk.galois";

// TODO: Implement this without tables (a la Rijndael) - it's much closer to Rijndael if we do

const ROUNDS = 8;
const ROUND_KEYS = ROUNDS + 1;

const G = [
	0x02, 0x01, 0x01, 0x03, 
	0x03, 0x02, 0x01, 0x01, 
	0x01, 0x03, 0x02, 0x01, 
	0x01, 0x01, 0x03, 0x02
];

const T_ENC = [
	0x97b1b126, 0x69cecea7, 0x73c3c3b0, 0xdf95954a, 
	0xb45a5aee, 0xafadad02, 0x3be7e7dc, 0x04020206, 
	0x9a4d4dd7, 0x884444cc, 0x03fbfbf8, 0xd7919146, 
	0x180c0c14, 0xfb87877c, 0xb7a1a116, 0xa05050f0, 
	0x63cbcba8, 0xce6767a9, 0xa85454fc, 0x4fdddd92, 
	0x8c4646ca, 0xeb8f8f64, 0x37e1e1d6, 0x9c4e4ed2, 
	0x15f0f0e5, 0x0ffdfdf2, 0x0dfcfcf1, 0x23ebebc8, 
	0x07f9f9fe, 0x7dc4c4b9, 0x341a1a2e, 0xdc6e6eb2, 
	0xbc5e5ee2, 0x1ff5f5ea, 0x6dcccca1, 0xef8d8d62, 
	0x381c1c24, 0xac5656fa, 0x864343c5, 0x09fefef7, 
	0x0e070709, 0xc26161a3, 0x05f8f8fd, 0xea75759f, 
	0xb25959eb, 0x0bfffff4, 0x06030305, 0x44222266, 
	0xe18a8a6b, 0x57d1d186, 0x26131335, 0x29eeeec7, 
	0xe588886d, 0x00000000, 0x1c0e0e12, 0x6834345c, 
	0x2a15153f, 0xf5808075, 0xdd949449, 0x33e3e3d0, 
	0x2fededc2, 0x9fb5b52a, 0xa65353f5, 0x46232365, 
	0x964b4bdd, 0x8e4747c9, 0x2e171739, 0xbba7a71c, 
	0xd5909045, 0x6a35355f, 0xa3abab08, 0x45d8d89d, 
	0x85b8b83d, 0x4bdfdf94, 0x9e4f4fd1, 0xae5757f9, 
	0xc19a9a5b, 0xd1929243, 0x43dbdb98, 0x361b1b2d, 
	0x783c3c44, 0x65c8c8ad, 0xc799995e, 0x0804040c, 
	0xe98e8e67, 0x35e0e0d5, 0x5bd7d78c, 0xfa7d7d87, 
	0xff85857a, 0x83bbbb38, 0x804040c0, 0x582c2c74, 
	0x743a3a4e, 0x8a4545cf, 0x17f1f1e6, 0x844242c6, 
	0xca6565af, 0x40202060, 0x824141c3, 0x30181828, 
	0xe4727296, 0x4a25256f, 0xd3939340, 0xe0707090, 
	0x6c36365a, 0x0a05050f, 0x11f2f2e3, 0x160b0b1d, 
	0xb3a3a310, 0xf279798b, 0x2dececc1, 0x10080818, 
	0x4e272769, 0x62313153, 0x64323256, 0x99b6b62f, 
	0xf87c7c84, 0x95b0b025, 0x140a0a1e, 0xe6737395, 
	0xb65b5bed, 0xf67b7b8d, 0x9bb7b72c, 0xf7818176, 
	0x51d2d283, 0x1a0d0d17, 0xd46a6abe, 0x4c26266a, 
	0xc99e9e57, 0xb05858e8, 0xcd9c9c51, 0xf3838370, 
	0xe874749c, 0x93b3b320, 0xadacac01, 0x60303050, 
	0xf47a7a8e, 0xd26969bb, 0xee777799, 0x1e0f0f11, 
	0xa9aeae07, 0x42212163, 0x49dede97, 0x55d0d085, 
	0x5c2e2e72, 0xdb97974c, 0x20101030, 0xbda4a419, 
	0xc598985d, 0xa5a8a80d, 0x5dd4d489, 0xd06868b8, 
	0x5a2d2d77, 0xc46262a6, 0x5229297b, 0xda6d6db7, 
	0x2c16163a, 0x924949db, 0xec76769a, 0x7bc7c7bc, 
	0x25e8e8cd, 0x77c1c1b6, 0xd996964f, 0x6e373759, 
	0x3fe5e5da, 0x61cacaab, 0x1df4f4e9, 0x27e9e9ce, 
	0xc66363a5, 0x24121236, 0x71c2c2b3, 0xb9a6a61f, 
	0x2814143c, 0x8dbcbc31, 0x53d3d380, 0x50282878, 
	0xabafaf04, 0x5e2f2f71, 0x39e6e6df, 0x4824246c, 
	0xa45252f6, 0x79c6c6bf, 0xb5a0a015, 0x1209091b, 
	0x8fbdbd32, 0xed8c8c61, 0x6bcfcfa4, 0xba5d5de7, 
	0x22111133, 0xbe5f5fe1, 0x02010103, 0x7fc5c5ba, 
	0xcb9f9f54, 0x7a3d3d47, 0xb1a2a213, 0xc39b9b58, 
	0x67c9c9ae, 0x763b3b4d, 0x89bebe37, 0xa25151f3, 
	0x3219192b, 0x3e1f1f21, 0x7e3f3f41, 0xb85c5ce4, 
	0x91b2b223, 0x2befefc4, 0x944a4ade, 0x6fcdcda2, 
	0x8bbfbf34, 0x81baba3b, 0xde6f6fb1, 0xc86464ac, 
	0x47d9d99e, 0x13f3f3e0, 0x7c3e3e42, 0x9db4b429, 
	0xa1aaaa0b, 0x4ddcdc91, 0x5fd5d58a, 0x0c06060a, 
	0x75c0c0b5, 0xfc7e7e82, 0x19f6f6ef, 0xcc6666aa, 
	0xd86c6cb4, 0xfd848479, 0xe2717193, 0x70383848, 
	0x87b9b93e, 0x3a1d1d27, 0xfe7f7f81, 0xcf9d9d52, 
	0x904848d8, 0xe38b8b68, 0x542a2a7e, 0x41dada9b, 
	0xbfa5a51a, 0x66333355, 0xf1828273, 0x7239394b, 
	0x59d6d68f, 0xf0787888, 0xf986867f, 0x01fafafb, 
	0x3de4e4d9, 0x562b2b7d, 0xa7a9a90e, 0x3c1e1e22, 
	0xe789896e, 0xc06060a0, 0xd66b6bbd, 0x21eaeacb, 
	0xaa5555ff, 0x984c4cd4, 0x1bf7f7ec, 0x31e2e2d3
];

const T_DEC = [
	0xe368bc02, 0x5585620c, 0x2a3f2331, 0x61ab13f7, 
	0x98d46d72, 0x21cb9a19, 0x3c22a461, 0x459d3dcd, 
	0x05fdb423, 0x2bc4075f, 0x9b2c01c0, 0x3dd9800f, 
	0x486c5c74, 0xf97f7e85, 0xf173ab1f, 0xb6edde0e, 
	0x283c6bed, 0x4997781a, 0x9f2a918d, 0xc9579f33, 
	0xa907a8aa, 0xa50ded7d, 0x7c422d8f, 0x764db0c9, 
	0x4d91e857, 0xcea963cc, 0xb4ee96d2, 0x3028e1b6, 
	0x0df161b9, 0xbd196726, 0x419bad80, 0xc0a06ec7, 
	0x5183f241, 0x92dbf034, 0x6fa21efc, 0x8f32ce4c, 
	0x13e03373, 0x69a7c66d, 0xe56d6493, 0xbf1a2ffa, 
	0xbb1cbfb7, 0x587403b5, 0xe76e2c4f, 0x5d89b796, 
	0xe89c052a, 0x446619a3, 0x342e71fb, 0x0ff22965, 
	0xfe81827a, 0xb11322f1, 0xa30835ec, 0xcd510f7e, 
	0xff7aa614, 0x5c7293f8, 0x2fc29712, 0xf370e3c3, 
	0x992f491c, 0xd1431568, 0xc2a3261b, 0x88cc32b3, 
	0x8acf7a6f, 0xb0e8069f, 0x7a47f51e, 0xd2bb79da, 
	0xe6950821, 0x4398e55c, 0xd0b83106, 0x11e37baf, 
	0x7e416553, 0xccaa2b10, 0xd8b4e49c, 0x6456a7d4, 
	0xfb7c3659, 0x724b2084, 0xea9f4df6, 0x6a5faadf, 
	0x2dc1dfce, 0x70486858, 0xcaaff381, 0x0605d891, 
	0x5a774b69, 0x94de28a5, 0x39df1042, 0x813bc347, 
	0xfc82caa6, 0x23c8d2c5, 0x03f86cb2, 0x080cd59a, 
	0xdab7ac40, 0x7db909e1, 0x3824342c, 0xcf5247a2, 
	0xdcb274d1, 0x63a85b2b, 0x35d55595, 0x479e7511, 
	0x15e5ebe2, 0x4b9430c6, 0x4a6f14a8, 0x91239c86, 
	0x4c6acc39, 0x5f8aff4a, 0x0406904d, 0xee99ddbb, 
	0x1e1152ca, 0xaaffc418, 0xeb646998, 0x07fefcff, 
	0x8b345e01, 0x567d0ebe, 0xbae79bd9, 0x4263c132, 
	0x75b5dc7b, 0x97264417, 0x67aecb66, 0x95250ccb, 
	0xec9a9567, 0x57862ad0, 0x60503799, 0xb8e4d305, 
	0x65ad83ba, 0x19efae35, 0xa4f6c913, 0xc15b4aa9, 
	0x873e1bd6, 0xa0f0595e, 0x18148a5b, 0xaf02703b, 
	0xab04e076, 0xdd4950bf, 0xdf4a1863, 0xc6a5b656, 
	0x853d530a, 0xfa871237, 0x77b694a7, 0x4665517f, 
	0xed61b109, 0x1bece6e9, 0xd5458525, 0xf5753b52, 
	0x7fba413d, 0x27ce4288, 0xb2eb4e43, 0xd6bde997, 
	0x527b9ef3, 0x62537f45, 0x2c3afba0, 0x7bbcd170, 
	0xb91ff76b, 0x121b171d, 0xfd79eec8, 0x3a277cf0, 
	0x0c0a45d7, 0x96dd6079, 0x2233f6ab, 0xacfa1c89, 
	0xc8acbb5d, 0xa10b7d30, 0xd4bea14b, 0xbee10b94, 
	0x25cd0a54, 0x547e4662, 0xa2f31182, 0x17e6a33e, 
	0x263566e6, 0xc3580275, 0x83388b9b, 0x7844bdc2, 
	0x020348dc, 0x4f92a08b, 0x2e39b37c, 0x4e6984e5, 
	0xf0888f71, 0x362d3927, 0x9cd2fd3f, 0x01fb246e, 
	0x893716dd, 0x00000000, 0xf68d57e0, 0xe293986c, 
	0x744ef815, 0x9320d45a, 0xad0138e7, 0xd3405db4, 
	0x1a17c287, 0xb3106a2d, 0x5078d62f, 0xf48e1f3c, 
	0xa70ea5a1, 0x71b34c36, 0x9ad725ae, 0x5e71db24, 
	0x161d8750, 0xef62f9d5, 0x8d318690, 0x1c121a16, 
	0xa6f581cf, 0x5b8c6f07, 0x37d61d49, 0x6e593a92, 
	0x84c67764, 0x86c53fb8, 0xd746cdf9, 0xe090d0b0, 
	0x29c74f83, 0xe49640fd, 0x0e090d0b, 0x6da15620, 
	0x8ec9ea22, 0xdb4c882e, 0xf776738e, 0xb515b2bc, 
	0x10185fc1, 0x322ba96a, 0x6ba48eb1, 0xaef95455, 
	0x406089ee, 0x6655ef08, 0xe9672144, 0x3e21ecbd, 
	0x2030be77, 0xf28bc7ad, 0x80c0e729, 0x141ecf8c, 
	0xbce24348, 0xc4a6fe8a, 0x31d3c5d8, 0xb716fa60, 
	0x5380ba9d, 0xd94fc0f2, 0x1de93e78, 0x24362e3a, 
	0xe16bf4de, 0xcb54d7ef, 0x09f7f1f4, 0x82c3aff5, 
	0x0bf4b928, 0x9d29d951, 0xc75e9238, 0xf8845aeb, 
	0x90d8b8e8, 0xdeb13c0d, 0x33d08d04, 0x685ce203, 
	0xc55ddae4, 0x3bdc589e, 0x0a0f9d46, 0x3fdac8d3, 
	0x598f27db, 0xa8fc8cc4, 0x79bf99ac, 0x6c5a724e, 
	0x8ccaa2fe, 0x9ed1b5e3, 0x1fea76a4, 0x73b004ea
];

let LOG2, EXP2, OFFSETS;

// TODO: Find a nice way to move this into cryptopunk.galois
// Not using GF multiply lookup tables here, since a and b are arbitrary values
// Instead, we use the fact that:
// a * b = 2^(log2(a) + log2(b))
function gfMul(a, b)
{
	if (a === 0 || b === 0)
	{
		return 0;
	}
	return EXP2[(LOG2[a] + LOG2[b]) % 255];
}

function precompute()
{
	if (LOG2)
	{
		return;
	}

	[LOG2, EXP2] = gfLog2Tables256(0x1f5);

	OFFSETS = new Array(ROUNDS);

	OFFSETS[0] = 1;
	for (let i = 1; i < ROUNDS; i++)
	{
		OFFSETS[i] = gfMul(2, OFFSETS[i - 1]);
	}
}

function transform(input, output)
{
	const
		a = new Array(16),
		b = new Array(16);

	for (let i = 0; i < 4; i++)
	{
		for (let j = 0; j < 4; j++)
		{
			a[i * 4 + j] = (input[i] >>> (24 - 8 * j)) & 0xff;
		}
	}

	for (let i = 0; i < 4; i++)
	{
		for (let j = 0; j < 4; j++)
		{
			b[i * 4 + j] = 0;
			for (let t = 0; t < 4; t++)
			{
				b[i * 4 + j] ^= gfMul(a[i * 4 + t], G[t * 4 + j]);
			}
		}
	}

	for (let i = 0; i < 4; i++)
	{
		for (let j = 0; j < 4; j++)
		{
			output[i] ^= (b[i * 4 + j] << (24 - 8 * j));
		}
	}
}

function round(text, T, k)
{
	const temp = new Array(4);
	for (let i = 0; i < 4; i++)
	{
		const shift = 24 - 8 * i;
		temp[i] =
			T[(text[0] >>> shift) & 0xff] ^
			ror(T[(text[1] >>> shift) & 0xff],  8) ^
			ror(T[(text[2] >>> shift) & 0xff], 16) ^
			ror(T[(text[3] >>> shift) & 0xff], 24);
	}

	for (let i = 0; i < 4; i++)
	{
		text[i] = temp[i] ^ k[i];
	}
}

class SquareTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	generateSubKeys(keyBytes)
	{
		const keyWords = bytesToInt32sBE(keyBytes);

		const tempKeys = new Array(ROUND_KEYS);

		for (let i = 0; i < ROUND_KEYS; i++)
		{
			tempKeys[i] = new Array(4);
		}

		for (let i = 0; i < 4; i++)
		{
			tempKeys[0][i] = keyWords[i];
		}

		for (let i = 1; i < ROUND_KEYS; i++)
		{
			const
				dest = tempKeys[i],
				source = tempKeys[i - 1];

			dest[0] = source[0] ^ rol(source[3], 8) ^ (OFFSETS[i - 1] << 24);
			dest[1] = source[1] ^ dest[0];
			dest[2] = source[2] ^ dest[1];
			dest[3] = source[3] ^ dest[2];
		}

		const result = new Array(ROUND_KEYS);

		if (this.decrypt)
		{
			for (let i = 0; i < ROUNDS; i++)
			{
				result[i] = tempKeys[ROUNDS - i];
			}
			result[ROUNDS] = new Array(4);
			result[ROUNDS].fill(0);
			transform(tempKeys[0], result[ROUNDS]);
		}
		else
		{
			for (let i = 0; i < ROUNDS; i++)
			{
				result[i] = new Array(4);
				result[i].fill(0);
				transform(tempKeys[i], result[i]);
			}
			result[ROUNDS] = tempKeys[ROUNDS];
		}

		return result;
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);

		precompute();

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const text = bytesToInt32sBE(block);

		for (let i = 0; i < 4; i++)
		{
			text[i] ^= subKeys[0][i];
		}

		for (let r = 1; r < ROUNDS; r++)
		{
			round(text, this.T, subKeys[r]);
		}

		const temp = new Array(4);
		for (let i = 0; i < 4; i++)
		{
			const shift = 24 - 8 * i;
			temp[i] =
				(this.SBOX[(text[0] >>> shift) & 0xff] << 24) |
				(this.SBOX[(text[1] >>> shift) & 0xff] << 16) |
				(this.SBOX[(text[2] >>> shift) & 0xff] <<  8) |
				(this.SBOX[(text[3] >>> shift) & 0xff]      );
		}

		for (let i = 0; i < 4; i++)
		{
			text[i] = temp[i] ^ subKeys[ROUNDS][i];
		}

		dest.set(int32sToBytesBE(text), destOffset);
	}
}

class SquareEncryptTransform extends SquareTransform
{
	constructor()
	{
		super(false);
		this.SBOX = SBOX_ENC;
		this.T = T_ENC;
	}
}

class SquareDecryptTransform extends SquareTransform
{
	constructor()
	{
		super(true);
		this.SBOX = SBOX_DEC;
		this.T = T_DEC;
	}
}

export {
	SquareEncryptTransform,
	SquareDecryptTransform
};