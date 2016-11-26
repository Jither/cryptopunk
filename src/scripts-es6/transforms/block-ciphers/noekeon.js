import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { rol, ror } from "../../cryptopunk.bitarith";

const MODE_NAMES = [
	"Indirect key",
	"Direct key"
];

const MODE_VALUES = [
	"indirect",
	"direct"
];

const NULL_VECTOR = [0, 0, 0, 0];

const ROUNDS = 16;
let ROUND_CONSTANTS;

function precompute()
{
	if (ROUND_CONSTANTS)
	{
		return;
	}

	ROUND_CONSTANTS = new Array(ROUNDS + 1);

	let constant = 0x80;
	for (let i = 0; i < ROUND_CONSTANTS.length; i++)
	{
		ROUND_CONSTANTS[i] = constant & 0xff;

		if ((constant & 0x80) !== 0)
		{
			constant = (constant << 1) ^ 0x1b;
		}
		else
		{
			constant = constant << 1;
		}
	}
}

function gamma(state)
{
	let [a0, a1, a2, a3] = state;

	a1 ^= (~a3) & (~a2);
	a0 ^= a2 & a1;

	[a0, a3] = [a3, a0];

	a2 ^= a0 ^ a1 ^ a3;

	a1 ^= (~a3) & (~a2);
	a0 ^= a2 & a1;

	state[0] = a0;
	state[1] = a1;
	state[2] = a2;
	state[3] = a3;
}

function theta(key, state)
{
	let [a0, a1, a2, a3] = state;

	let temp = a0 ^ a2;
	temp ^= ror(temp, 8) ^ rol(temp, 8);
	a1 ^= temp;
	a3 ^= temp;

	a0 ^= key[0];
	a1 ^= key[1];
	a2 ^= key[2];
	a3 ^= key[3];

	temp = a1 ^ a3;
	temp ^= ror(temp, 8) ^ rol(temp, 8);
	a0 ^= temp;
	a2 ^= temp;

	state[0] = a0;
	state[1] = a1;
	state[2] = a2;
	state[3] = a3;
}

function pi1(state)
{
	state[1] = rol(state[1], 1);
	state[2] = rol(state[2], 5);
	state[3] = rol(state[3], 2);
}

function pi2(state)
{
	state[1] = ror(state[1], 1);
	state[2] = ror(state[2], 5);
	state[3] = ror(state[3], 2);
}

function round(key, state, constant1, constant2)
{
	state[0] ^= constant1;
	theta(key, state);
	state[0] ^= constant2;
	pi1(state);
	gamma(state);
	pi2(state);
}

class NoekeonTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("mode", "Mode", "indirect", { type: "select", texts: MODE_NAMES, values: MODE_VALUES });
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 128);

		precompute();
		const key = this.generateWorkingKey(keyBytes, this.options.mode);

		return this.transformBlocks(bytes, 128, key);
	}

	generateWorkingKey(keyBytes, mode)
	{
		if (mode === "direct")
		{
			return bytesToInt32sBE(keyBytes);
		}

		// Indirect mode = encrypt key (as plaintext) with null vector as key
		this.keyEncrypter = this.keyEncrypter || new NoekeonEncryptTransform(); // eslint-disable-line no-use-before-define
		this.keyEncryptResult = this.keyEncryptResult || new Uint8Array(16);
		this.keyEncrypter.transformBlock(keyBytes, this.keyEncryptResult, 0, NULL_VECTOR);

		return bytesToInt32sBE(this.keyEncryptResult);
	}
}

class NoekeonEncryptTransform extends NoekeonTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, key)
	{
		const state = bytesToInt32sBE(block);

		for (let r = 0; r < ROUNDS; r++)
		{
			round(key, state, ROUND_CONSTANTS[r], 0);
		}
		state[0] ^= ROUND_CONSTANTS[ROUNDS];
		theta(key, state);

		dest.set(int32sToBytesBE(state), destOffset);
	}
}

class NoekeonDecryptTransform extends NoekeonTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, key)
	{
		const state = bytesToInt32sBE(block);

		theta(NULL_VECTOR, key);

		for (let r = ROUNDS; r > 0; r--)
		{
			round(key, state, 0, ROUND_CONSTANTS[r]);
		}
		theta(key, state);
		state[0] ^= ROUND_CONSTANTS[0];

		dest.set(int32sToBytesBE(state), destOffset);
	}
}

export {
	NoekeonEncryptTransform,
	NoekeonDecryptTransform
};