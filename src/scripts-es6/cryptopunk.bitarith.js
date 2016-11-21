const ONE_64 = { hi: 0, lo: 1 };
const ZERO_64 = { hi: 0, lo: 0 };

function rol16(val, count)
{
	count = count % 16;
	return (val << count) | (val >>> (16 - count)) & 0xffff;
}

function ror16(val, count)
{
	count = count % 16;
	return (val >>> count) | (val << (16 - count)) & 0xffff;
}

function add(...terms)
{
	const len = terms.length;
	if (len < 2)
	{
		throw new Error("Cannot add() a single term");
	}

	let lo = 0, hi = 0;

	for (let i = 0; i < len; i++)
	{
		const term = terms[i];
		lo += term & 0xffff;
		hi += (term >> 16) + (lo >> 16);
		lo = lo & 0xffff;
		hi = hi & 0xffff;
	}
	return (hi << 16) | lo;
}

function mul(a, b)
{
	const
		a16 = a >>> 16,
		a00 = a & 0xffff,

		b16 = b >>> 16,
		b00 = b & 0xffff;

	let r00, r16;

	r00  = a00 * b00;
	r16  = (r00 >>> 16) + a16 * b00 + a00 * b16;

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

export {
	add,
	add64,
	and64,
	mul,
	mul64,
	not64,
	or64,
	rol,
	rol16,
	rol48,
	rol64,
	ror,
	ror16,
	ror48,
	ror64,
	shl64,
	shr64,
	sub64,
	xor64,
	mirror,
	ONE_64,
	ZERO_64
};