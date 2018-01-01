import { MdHashTransform } from "./hash";
import { xorBytes, rolBytes, rorBytes, addBytes, subBytes, notBytes } from "../../cryptopunk.bitarith";

// TODO: Cleanup

const VARIANT_NAMES = [
	"Tiger",
	"Tiger2"
];

const VARIANT_VALUES = [
	"tiger",
	"tiger2"
];

const KEY_SCHEDULE_CONST_1 = Uint8Array.of(0xa5, 0xa5, 0xa5, 0xa5, 0xa5, 0xa5, 0xa5, 0xa5);
const KEY_SCHEDULE_CONST_2 = Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef);

const INITIAL_STATE = [
	Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef),
	Uint8Array.of(0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10),
	Uint8Array.of(0xf0, 0x96, 0xa5, 0xb4, 0xc3, 0xb2, 0xe1, 0x87)
];

let T1, T2, T3, T4;

function splitBytesLE(x, length)
{
	const result = new Array(x.length / length);
	let index = 0;
	for (let i = 0; i < x.length; i += length)
	{
		result[index] = Uint8Array.from(x.subarray(i, i + length));
		result[index].reverse();
		index++;
	}
	return result;
}

function combineBytesLE(x)
{
	const count = x.length;
	const length = x[0].length;
	const result = new Uint8Array(count * length);
	for (let i = 0; i < count; i++)
	{
		result.set(x[i], length * i);
		result.subarray(i * length, (i + 1) * length).reverse();
	}
	return result;
}

function mulBytes(x, mul)
{
	let carry = 0;
	for (let i = 7; i >= 0; i--)
	{
		const r = x[i] * mul + carry;
		carry = r >> 8;
		x[i] = r & 0xff;
	}
}

function shlBytes(a, n)
{
	// TODO: Temporary hack - hardcoded to 19
	rolBytes(a, n);
	a[7] = 0;
	a[6] = 0;
	a[5] &= 0b11111000;
}

function shrBytes(a, n)
{
	// TODO: Temporary hack - hardcoded to 23
	rorBytes(a, n);
	a[0] = 0;
	a[1] = 0;
	a[2] &= 0b00000001;
}

function getInitialState()
{
	return [
		Uint8Array.from(INITIAL_STATE[0]),
		Uint8Array.from(INITIAL_STATE[1]),
		Uint8Array.from(INITIAL_STATE[2]),
	];
}

function gen(str, passes)
{
	const state = getInitialState();

	const tempStr = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++)
	{
		tempStr[i] = str.charCodeAt(i);
	}

	const seed = splitBytesLE(tempStr, 8);
	
	const x = new Array(seed.length);
	for (let i = 0; i < seed.length; i++)
	{
		x[i] = new Uint8Array(seed[i].length);
	}

	const TABLES = new Array(4);
	for (let t = 0; t < 4; t++)
	{
		const table = TABLES[t] = new Array(256);
		for (let i = 0; i < 256; i++)
		{
			table[i] = new Uint8Array(8);
			table[i].fill(i);
		}
	}
	T1 = TABLES[0];
	T2 = TABLES[1];
	T3 = TABLES[2];
	T4 = TABLES[3];

	let abc = 2;

	for (let cnt = 0; cnt < passes; cnt++)
	{
		for (let i = 0; i < 256; i++)
		{
			for (let t = 0; t < 4; t++)
			{
				const table = TABLES[t];
				abc++;
				if (abc === 3)
				{
					abc = 0;

					// Reset message:
					for (let s = 0; s < seed.length; s++)
					{
						x[s].set(seed[s]);
					}
					compress(x, state);
				}

				for (let col = 0; col < 8; col++)
				{
					const dest = state[abc][col];
					const tmp = table[i][col];
					table[i][col] = table[dest][col];
					table[dest][col] = tmp;
				}
			}
		}
	}
}

function precompute()
{
	if (T1)
	{
		return;
	}

	gen("Tiger - A Fast New Hash Function, by Ross Anderson and Eli Biham", 5);
}

function round(v, x, mul)
{
	const [a, b, c] = v;
	const temp = new Uint8Array(8);
	xorBytes(c, x);

	temp.set(      T1[c[7]]);
	xorBytes(temp, T2[c[5]]);
	xorBytes(temp, T3[c[3]]);
	xorBytes(temp, T4[c[1]]);
	subBytes(a, temp);

	temp.set(      T4[c[6]]);
	xorBytes(temp, T3[c[4]]);
	xorBytes(temp, T2[c[2]]);
	xorBytes(temp, T1[c[0]]);
	addBytes(b, temp);
	
	mulBytes(b, mul);

	// Rotate a, b, c - 1 word left
	v[0] = b; v[1] = c; v[2] = a;
}

function keySchedule(x)
{
	const [x0, x1, x2, x3, x4, x5, x6, x7] = x;
	const temp = new Uint8Array(8);
	
	temp.set(x7);
	xorBytes(temp, KEY_SCHEDULE_CONST_1);

	subBytes(x0, temp);
	xorBytes(x1, x0);
	addBytes(x2, x1);

	temp.set(x1);
	notBytes(temp);
	shlBytes(temp, 19);
	xorBytes(temp, x2);
	subBytes(x3, temp);

	xorBytes(x4, x3);
	addBytes(x5, x4);

	temp.set(x4);
	notBytes(temp);
	shrBytes(temp, 23);
	xorBytes(temp, x5);
	subBytes(x6, temp);

	xorBytes(x7, x6);
	addBytes(x0, x7);

	temp.set(x7);
	notBytes(temp);
	shlBytes(temp, 19);
	xorBytes(temp, x0);
	subBytes(x1, temp);
	
	xorBytes(x2, x1);
	addBytes(x3, x2);

	temp.set(x2);
	notBytes(temp);
	shrBytes(temp, 23);
	xorBytes(temp, x3);
	subBytes(x4, temp);
	
	xorBytes(x5, x4);
	addBytes(x6, x5);

	temp.set(x6);
	xorBytes(temp, KEY_SCHEDULE_CONST_2);
	subBytes(x7, temp);
	
	x[0] = x0; x[1] = x1; x[2] = x2; x[3] = x3; x[4] = x4; x[5] = x5; x[6] = x6; x[7] = x7;
}

function compress(x, state)
{
	const v = new Array(3);

	for (let i = 0; i < 3; i++)
	{
		v[i] = Uint8Array.from(state[i]);
	}

	for (let step = 0; step < 8; step++)
	{
		round(v, x[step], 5);
	}

	keySchedule(x);

	for (let step = 0; step < 8; step++)
	{
		round(v, x[step], 7);
	}

	keySchedule(x);

	for (let step = 0; step < 8; step++)
	{
		round(v, x[step], 9);
	}

	xorBytes(state[0], v[0]);
	subBytes(v[1], state[1]);
	state[1].set(v[1]);
	addBytes(state[2], v[2]);
}

class TigerTransform extends MdHashTransform
{
	constructor()
	{
		super(512);
		this.addOption("variant", "Variant", "tiger", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES });
	}

	transform(bytes)
	{
		precompute();

		this.paddingStartBit = this.options.variant === "tiger2" ? 0x80 : 0x01;

		const state = getInitialState();

		this.transformBlocks(bytes, state);

		return combineBytesLE(state);
	}

	transformBlock(block, state)
	{
		const x = splitBytesLE(block, 8);

		compress(x, state);
	}
}

export {
	TigerTransform
};