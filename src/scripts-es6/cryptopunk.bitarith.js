const ONE_64 = { hi: 0, lo: 1 };
const ZERO_64 = { hi: 0, lo: 0 };

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

function not64(term)
{
	return { hi: ~term.hi, lo: ~term.lo };
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

export {
	add,
	rol,
	ror,
	add64,
	and64,
	not64,
	rol64,
	ror64,
	xor64,
	shr64,
	sub64,
	ONE_64,
	ZERO_64,
	rol48,
	ror48
};