import { gcd } from "./cryptopunk.math";

const ONE_64 = { hi: 0, lo: 1 };
const TWO_64 = { hi: 0, lo: 2 };
const ZERO_64 = { hi: 0, lo: 0 };

function rol16(val, count)
{
	count = count % 16;
	val = val & 0xffff;
	return ((val << count) | (val >>> (16 - count))) & 0xffff;
}

function ror16(val, count)
{
	count = count % 16;
	val = val & 0xffff;
	return ((val >>> count) | (val << (16 - count))) & 0xffff;
}

function rol24(val, count)
{
	count = count % 24;
	val = val & 0xffffff;
	return ((val << count) | (val >>> (24 - count))) & 0x00ffffff;
}

function ror24(val, count)
{
	count = count % 24;
	val = val & 0xffffff;
	return ((val >>> count) | (val << (24 - count))) & 0x00ffffff;
}

function add(...terms)
{
	const len = terms.length;
	if (len < 2)
	{
		throw new Error("Cannot add() a single term");
	}

	let result = 0;

	for (let i = 0; i < len; i++)
	{
		result += terms[i];
	}

	return result & 0xffffffff;
}

function sub(a, b)
{
	return (a - b) & 0xffffffff;
}

function mul(a, b)
{
	const
		a16 = a >>> 16,
		a00 = a & 0xffff,

		b16 = b >>> 16,
		b00 = b & 0xffff;

	const r00 = a00 * b00;
	const r16 = (r00 >>> 16) + a16 * b00 + a00 * b16;

	return ((r16 & 0xffff) << 16) | (r00 & 0xffff);
}

function rol(val, count)
{
	return (val << count) | (val >>> (32 - count));
}

function ror(val, count)
{
	return (val >>> count) | (val << (32 - count));
}

function add64(...terms)
{
	const len = terms.length;
	if (len < 2)
	{
		throw new Error("Cannot add64() a single term");
	}

	let r00 = 0, r16 = 0, r32 = 0, r48 = 0;

	for (let i = 0; i < len; i++)
	{
		const termlo = terms[i].lo;
		const termhi = terms[i].hi;

		r00 +=  termlo & 0xffff;
		r16 += (termlo   >>> 16) + (r00 >>> 16);
		r32 += (termhi & 0xffff) + (r16 >>> 16);
		r48 += (termhi   >>> 16) + (r32 >>> 16);

		r00 &= 0xffff;
		r16 &= 0xffff;
		r32 &= 0xffff;
		r48 &= 0xffff;
	}
	return { hi: (r48 << 16) | r32, lo: (r16 << 16) | r00 };
}

function sub64(a, b)
{
	return add64(a, ONE_64, not64(b));
}

function and64(...terms)
{
	const len = terms.length;
	if (len < 2)
	{
		throw new Error("Cannot and64() a single term");
	}

	const result = { lo: terms[0].lo, hi: terms[0].hi };
	for (let i = 1; i < len; i++)
	{
		const term = terms[i];
		result.lo &= term.lo;
		result.hi &= term.hi;
	}
	return result;
}

function mul64(a, b)
{
	const
		a48 = a.hi >>> 16,
		a32 = a.hi & 0xffff,
		a16 = a.lo >>> 16,
		a00 = a.lo & 0xffff,

		b48 = b.hi >>> 16,
		b32 = b.hi & 0xffff,
		b16 = b.lo >>> 16,
		b00 = b.lo & 0xffff;

	let r00, r16, r32, r48;

	r00  = a00 * b00;
	r16  = r00 >>> 16;
	r00 &= 0xffff;
	r16 += a16 * b00;
	r32  = r16 >>> 16;
	r16 &= 0xffff;
	r16 += a00 * b16;
	r32 += r16 >>> 16;
	r16 &= 0xffff;
	r32 += a32 * b00;
	r48  = r32 >>> 16;
	r32 &= 0xffff;
	r32 += a16 * b16;
	r48 += r32 >>> 16;
	r32 &= 0xffff;
	r32 += a00 * b32;
	r48 += r32 >>> 16;
	r32 &= 0xffff;
	r48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
	r48 &= 0xffff;

	return {
		hi: (r48 << 16) | r32,
		lo: (r16 << 16) | r00
	};
}

function not64(term)
{
	return { hi: ~term.hi, lo: ~term.lo };
}

function or64(...terms)
{
	const len = terms.length;
	if (len < 2)
	{
		throw new Error("Cannot or64() a single term");
	}

	const result = { lo: terms[0].lo, hi: terms[0].hi };
	for (let i = 1; i < len; i++)
	{
		const term = terms[i];
		result.lo |= term.lo;
		result.hi |= term.hi;
	}
	return result;
}

function rol64(val, count)
{
	const result = {};
	if (count === 0)
	{
		result.hi = val.hi;
		result.lo = val.lo;
	}
	else if (count === 32)
	{
		// Javascript can shift at most 31 bits
		// Besides, this is simpler:
		result.hi = val.lo;
		result.lo = val.hi;
	}
	else if (count < 32)
	{
		result.hi = (val.hi << count) | (val.lo >>> (32 - count));
		result.lo = (val.lo << count) | (val.hi >>> (32 - count));
	}
	else
	{
		result.hi = (val.lo << (count - 32)) | (val.hi >>> (64 - count));
		result.lo = (val.hi << (count - 32)) | (val.lo >>> (64 - count));
	}
	return result;
}

function ror64(val, count)
{
	const result = {};
	if (count === 0)
	{
		result.hi = val.hi;
		result.lo = val.lo;
	}
	else if (count === 32)
	{
		// Javascript can shift at most 31 bits
		// Besides, this is simpler:
		result.hi = val.lo;
		result.lo = val.hi;
	}
	else if (count < 32)
	{
		result.hi = (val.hi >>> count) | (val.lo << (32 - count));
		result.lo = (val.lo >>> count) | (val.hi << (32 - count));
	}
	else
	{
		result.hi = (val.lo >>> (count - 32)) | (val.hi << (64 - count));
		result.lo = (val.hi >>> (count - 32)) | (val.lo << (64 - count));
	}
	return result;
}

function rol48(val, count)
{
	const result = {};
	if (count === 0)
	{
		result.hi = val.hi;
		result.lo = val.lo;
	}
	else if (count <= 16)
	{
		result.hi = ((val.hi << count) | (val.lo >>> (32 - count))) & 0xffff;
		result.lo = (val.lo << count) | (val.hi >>> (16 - count));
	}
	else
	{
		throw Error("rol48 only supports up to 16 bit rotation for now.");
	}
	return result;
}

function ror48(val, count)
{
	const result = {};
	if (count === 0)
	{
		result.hi = val.hi;
		result.lo = val.lo;
	}
	else if (count <= 16)
	{
		result.hi = ((val.hi >>> count) | (val.lo << (16 - count))) & 0xffff;
		result.lo = (val.lo >>> count) | (val.hi << (32 - count));
	}
	else
	{
		throw Error("ror48 only supports up to 16 bit rotation for now.");
	}
	return result;
}

function shl64(val, count)
{
	const result = {};
	if (count === 0)
	{
		// This would cause hi << 32, which Javascript won't do
		// Besides, this is simpler:
		result.hi = val.hi;
		result.lo = val.lo;
	}
	else if (count < 32)
	{
		result.hi = val.hi << count | (val.lo >>> (32 - count));
		result.lo = val.lo << count;
	}
	else
	{
		result.lo = 0;
		result.hi = val.lo << (count - 32);
	}
	return result;
}

function shr64(val, count)
{
	const result = {};
	if (count === 0)
	{
		// This would cause hi << 32, which Javascript won't do
		// Besides, this is simpler:
		result.hi = val.hi;
		result.lo = val.lo;
	}
	else if (count < 32)
	{
		result.hi = val.hi >>> count;
		result.lo = val.lo >>> count | (val.hi << (32 - count));
	}
	else
	{
		result.hi = 0;
		result.lo = val.hi >>> (count - 32);
	}
	return result;
}

function xor64(...terms)
{
	const len = terms.length;
	if (len < 2)
	{
		throw new Error("Cannot xor64() a single term");
	}

	const result = { lo: terms[0].lo, hi: terms[0].hi };
	for (let i = 1; i < len; i++)
	{
		const term = terms[i];
		result.lo ^= term.lo;
		result.hi ^= term.hi;
	}
	return result;
}

function addBytes(a, ...rest)
{
	const last = a.length - 1;
	for (const b of rest)
	{
		let carry = 0;
		for (let i = last; i >= 0; i--)
		{
			const r = a[i] + b[i] + carry;
			carry = r >> 8;
			a[i] = r & 0xff;
		}
	}
}

function addBytesSmall(a, small)
{
	let carry = 0;
	for (let i = a.length - 1; i >= 0; i--)
	{
		const r = a[i] + small + carry;
		carry = r >> 8;
		a[i] = r & 0xff;
		if (carry === 0)
		{
			break;
		}
	}
}

function subBytes(a, b)
{
	const last = a.length - 1;
	let borrow = 0;
	for (let i = last; i >= 0; i--)
	{
		const r = a[i] - b[i] - borrow;
		borrow = r < 0;
		a[i] = r & 0xff;
	}
}

// TODO: Optimize
function mulBytes(a, b)
{
	const last = a.length - 1;
	const answer = new Uint8Array(a.length);

	for (let ai = last; ai >= 0; ai--)
	{
		let carry = 0;
		let answerIndex = ai;
		for (let bi = last; bi >= 0; bi--)
		{
			const r = a[ai] * b[bi] + carry + answer[answerIndex];
			carry = r >> 8;
			answer[answerIndex--] = r & 0xff;
		}
	}

	a.set(answer);
}

function mulBytesSmall(x, small)
{
	let carry = 0;
	for (let i = x.length - 1; i >= 0; i--)
	{
		const r = x[i] * small + carry;
		carry = r >> 8;
		x[i] = r & 0xff;
	}
}

function notBytes(a)
{
	for (let i = 0; i < a.length; i++)
	{
		a[i] = ~a[i];
	}
}

function rorBytes(bytes, count)
{
	count = count % (bytes.length * 8);
	if (count === 0)
	{
		return;
	}

	const byteCount = Math.floor(count / 8);
	const bitCount = count % 8;
	const length = bytes.length;
	
	if (byteCount > 0)
	{
		// Juggling algorithm for inplace shifting of bytes
		const setCount = gcd(byteCount, length);

		for (let start = 0; start < setCount; start++)
		{
			let dest = start;
			const temp = bytes[start];

			for (;;)
			{
				// dest - count will obviously be negative for dest < count
				// Add length to get positive modulo (as opposed to remainder)
				const source = (dest - byteCount + length) % length;
				if (source === start)
				{
					bytes[dest] = temp;
					break;
				}
				bytes[dest] = bytes[source];
				dest = source;
			}
		}
	}

	if (bitCount > 0)
	{
		const temp = bytes[length - 1];
		for (let dest = length - 1; dest >= 0; dest--)
		{
			const source = dest - 1;
			const val = source < 0 ? temp : bytes[source];
			bytes[dest] = ((bytes[dest] >>> bitCount) | val << (8 - bitCount)) & 0xff;
		}
	}
}

function rolBytes(bytes, count)
{
	count = count % (bytes.length * 8);
	if (count === 0)
	{
		return;
	}

	const byteCount = Math.floor(count / 8);
	const bitCount = count % 8;
	const length = bytes.length;
	
	if (byteCount > 0)
	{
		// Juggling algorithm for inplace shifting of bytes
		const setCount = gcd(byteCount, length);

		for (let start = 0; start < setCount; start++)
		{
			let dest = start;
			const temp = bytes[start];

			for (;;)
			{
				const source = (dest + byteCount) % length;
				if (source === start)
				{
					bytes[dest] = temp;
					break;
				}
				bytes[dest] = bytes[source];
				dest = source;
			}
		}
	}

	if (bitCount > 0)
	{
		const temp = bytes[0];
		for (let dest = 0; dest < length; dest++)
		{
			const source = dest + 1;
			const val = source >= length ? temp : bytes[source];
			bytes[dest] = ((bytes[dest] << bitCount) | val >> (8 - bitCount)) & 0xff;
		}
	}
}

function xorBytes(dest, ...terms)
{
	const destLength = dest.length;

	for (let i = 0; i < terms.length; i++)
	{
		const term = terms[i];
		if (term.length !== destLength)
		{
			throw new Error("Can only xor byte arrays with same length");
		}
		for (let j = 0; j < term.length; j++)
		{
			dest[j] ^= term[j];
		}
	}
}

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

function mirror(value, bits)
{
	let result = 0;
	for (let i = 0; i < bits; i++)
	{
		result <<= 1;
		result |= (value >>> i) & 1;
	}
	return result;
}

function mirror64(value)
{
	return {
		hi: mirror(value.lo, 32),
		lo: mirror(value.hi, 32)
	};
}

// Calculates modular multiplicative inverse mod 2^32
// Using method derived from Newton's method
function modInv32(a)
{
	let u = (2 - a) & 0xffffffff;
	let i = (a - 1) & 0xffffffff;
	// 4 iterations needed for 32 bits precision:
	for (let r = 0; r < 4; r++)
	{
		i = mul(i, i);
		u = mul(u, i + 1);
	}
	return u;
}

// Calculates modular multiplicative inverse mod 2^64
// a: 64-bit
function modInv64(a)
{
	let u = sub64(TWO_64, a);
	let i = sub64(a, ONE_64);
	// 5 iterations needed for 64 (really 96) bits precision:
	for (let r = 0; r < 5; r++)
	{
		i = mul64(i, i);
		u = mul64(u, add64(i, ONE_64));
	}
	return u;
}

// Permutates bits in x based on p array
// p array indices the source bit position (right-most bit = 0)
// for each destination bit (left to right).
// That is, [7, 6, 5, 4, 3, 2, 1, 0] would make no change
function permutateBits(x, p)
{
	let result = 0;
	for (let i = 0; i < p.length; i++)
	{
		result <<= 1;
		const b = (x >>> p[i]) & 1;
		result |= b;
	}
	return result;
}

// Parity of 8 bit word: Sum of bits mod 2
function parity8(x)
{
	x ^= x >>> 4;
	x ^= x >>> 2;
	x ^= x >>> 1;
	return x & 1;
}


// Parity of 32 bit word: Sum of bits mod 2
function parity32(x)
{
	x ^= x >>> 16;
	x ^= x >>> 8;
	x ^= x >>> 4;
	x ^= x >>> 2;
	x ^= x >>> 1;
	return x & 1;
}

export {
	add,
	add64,
	addBytes,
	addBytesSmall,
	and64,
	modInv32,
	modInv64,
	mul,
	mul64,
	mulBytes,
	mulBytesSmall,
	not64,
	notBytes,
	or64,
	parity8,
	parity32,
	rol,
	rol16,
	rol24,
	rol48,
	rol64,
	rolBytes,
	ror,
	ror16,
	ror24,
	ror48,
	ror64,
	rorBytes,
	shl64,
	shr64,
	sub,
	sub64,
	subBytes,
	xor64,
	xorBytes,
	splitBytesLE,
	combineBytesLE,
	mirror,
	mirror64,
	permutateBits,
	ONE_64,
	TWO_64,
	ZERO_64
};