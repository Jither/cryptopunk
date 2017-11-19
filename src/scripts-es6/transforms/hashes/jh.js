import { MdHashTransform } from "./hash";

const SIZE_VALUES = [
	224,
	256,
	384,
	512
];

const SIZE_NAMES = [
	"224 bits",
	"256 bits",
	"384 bits",
	"512 bits"
];

const VARIANT_VALUES = [
	"JH",
	"JH42"
];

const VARIANT_NAMES = [
	"JH (35.5 rounds)",
	"JH42 (42 rounds)"
];

const ROUND_CONSTANT_0 = [
	0x6,0xa,0x0,0x9,0xe,0x6,0x6,0x7,
	0xf,0x3,0xb,0xc,0xc,0x9,0x0,0x8,
	0xb,0x2,0xf,0xb,0x1,0x3,0x6,0x6,
	0xe,0xa,0x9,0x5,0x7,0xd,0x3,0xe,
	0x3,0xa,0xd,0xe,0xc,0x1,0x7,0x5,
	0x1,0x2,0x7,0x7,0x5,0x0,0x9,0x9,
	0xd,0xa,0x2,0xf,0x5,0x9,0x0,0xb,
	0x0,0x6,0x6,0x7,0x3,0x2,0x2,0xa
];

const SBOX_0 = [0x9,0x0,0x4,0xb,0xd,0xc,0x3,0xf,0x1,0xa,0x2,0x6,0x7,0x5,0x8,0xe];
const SBOX_1 = [0x3,0xc,0x6,0xd,0x5,0x7,0x1,0x9,0xf,0x2,0x0,0x4,0xb,0xa,0xe,0x8];

const ZERO_BUFFER = new Uint8Array(64);

function L(a, b)
{
	b ^= ((a << 1) ^ (a >>> 3) ^ ((a >>> 2) & 0b10)) & 0b1111;
	a ^= ((b << 1) ^ (b >>> 3) ^ ((b >>> 2) & 0b10)) & 0b1111;

	return [a, b];
}

function R(state, a, temp, count)
{
	const count2 = count / 2;

	for (let i = 0; i < count; i += 2)
	{
		[temp[i], temp[i + 1]] = L(temp[i], temp[i + 1]);
	}

	for (let i = 0; i < count; i += 4)
	{
		[temp[i + 2], temp[i + 3]] = [temp[i + 3], temp[i + 2]];
	}

	for (let i = 0; i < count2; i++)
	{
		a[i] = temp[i * 2];
		a[i + count2] = temp[i * 2 + 1];
	}

	for (let i = count2; i < count; i += 2)
	{
		[a[i], a[i + 1]] = [a[i + 1], a[i]];
	}
}

function R8(state, half)
{
	const temp = state.temp;
	const roundConstant = state.roundConstant;
	const a = state.a;
	for (let i = 0; i < 256; i++)
	{
		const expanded = (roundConstant[i >> 2] >> (3 - i % 4)) & 1;
		const sbox = expanded === 0 ? SBOX_0 : SBOX_1;
		temp[i] = sbox[a[i]];
	}

	if (!half)
	{
		R(state, a, temp, 256);
	}
	else
	{
		a.set(temp);
	}
}

function updateRoundConstant(state)
{
	const temp = state.temp;
	const roundConstant = state.roundConstant;

	for (let i = 0; i < 64; i++)
	{
		temp[i] = SBOX_0[roundConstant[i]];
	}

	R(state, roundConstant, temp, 64);
}

function E8InitialGroup(state)
{
	const h = state.h;
	const a = state.a;
	let odd = 0;
	for (let i = 0; i < 256; i++)
	{
		if (i === 128)
		{
			odd = 1;
		}
		const shift = 7 - (i & 7);
		const t0 = (h[ i        >> 3] >> shift) & 1;
		const t1 = (h[(i + 256) >> 3] >> shift) & 1;
		const t2 = (h[(i + 512) >> 3] >> shift) & 1;
		const t3 = (h[(i + 768) >> 3] >> shift) & 1;
		const t = (t0 << 3) | (t1 << 2) | (t2 << 1) | t3;

		// Intertwine 0-127 and 128-255
		const ai = (i % 128) * 2 + odd;
		a[ai] = t;
	}
}

function E8FinalDegroup(state)
{
	const h = state.h;
	const a = state.a;

	for (let i = 0; i < 128; i++)
	{
		h[i] = 0;
	}

	let odd = 0;
	for (let i = 0; i < 256; i++)
	{
		if (i === 128)
		{
			odd = 1;
		}

		const shift = 7 - (i & 7);
		const v = a[(i % 128) * 2 + odd];

		const t0 = (v >> 3) & 1;
		const t1 = (v >> 2) & 1;
		const t2 = (v >> 1) & 1;
		const t3 = v & 1;

		h[i >> 3] |= t0 << shift;
		h[(i + 256) >> 3] |= t1 << shift;
		h[(i + 512) >> 3] |= t2 << shift;
		h[(i + 768) >> 3] |= t3 << shift;
	}
}

function E8(state, variant)
{
	const roundConstant = state.roundConstant;
	for (let i = 0; i < 64; i++)
	{
		roundConstant[i] = ROUND_CONSTANT_0[i];
	}

	E8InitialGroup(state);

	// Tweaked JH42 uses 42 rounds
	// Pre-tweak JH uses 35.5 rounds
	const rounds = variant === "JH42" ? 42 : 35;
	for (let i = 0; i < rounds; i++)
	{
		R8(state);
		updateRoundConstant(state);
	}

	// Pre-tweak JH does a half-round:
	if (variant !== "JH42")
	{
		R8(state, true);
	}

	E8FinalDegroup(state);
}

function F8(buffer, state, variant)
{
	const h = state.h;

	for (let i = 0; i < 64; i++)
	{
		h[i] ^= buffer[i];
	}

	E8(state, variant);
	
	for (let i = 0; i < 64; i++)
	{
		h[i + 64] ^= buffer[i];
	}
}

class JhTransform extends MdHashTransform
{
	constructor()
	{
		super(512, "BE", 16);
		this.paddingAlwaysAddsBlock = true;
		
		this.addOption("variant", "Variant", "JH42", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES })
			.addOption("size", "Size", 256, { type: "select", values: SIZE_VALUES, texts: SIZE_NAMES });
	}

	transform(bytes)
	{
		const state = this.initState(this.options.size);
		const length = this.options.size / 8;

		this.transformBlocks(bytes, state);

		return state.h.subarray(128 - length);
	}

	transformBlock(block, state)
	{
		F8(block, state, this.options.variant);
	}

	initState(size)
	{
		const state = {
			size,
			messageSize: 0,
			h: new Uint8Array(128),
			a: new Uint8Array(256), // Only low nibbles used
			roundConstant: new Uint8Array(64), // Only low nibbles used
			temp: new Uint8Array(256)
		};

		state.h[1] = size & 0xff;
		state.h[0] = (size >>> 8) & 0xff;

		F8(ZERO_BUFFER, state, this.options.variant);

		return state;
	}
}

export {
	JhTransform
};
