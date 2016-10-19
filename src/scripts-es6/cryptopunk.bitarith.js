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
		lo += (term & 0xffff);
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

	let lo = 0, hi = 0, rlo = 0, rhi = 0;

	for (let i = 0; i < len; i++)
	{
		const termlo = terms[i].lo;
		const termhi = terms[i].hi;

		lo += termlo & 0xffff;
		hi +=  (termlo >>> 16)   + ( lo >>> 16);
		rlo += (termhi & 0xffff) + ( hi >>> 16);
		rhi += (termhi >>> 16)   + (rlo >>> 16);

		lo = lo & 0xffff;
		hi = hi & 0xffff;
		rlo = rlo & 0xffff;
		rhi = rhi & 0xffff;
	}
	return { hi: (rhi << 16) | rlo, lo: (hi << 16) | lo };
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
		result.hi = (val.hi >>> count) | ((val.lo << (32 - count)) & 0xffffffff);
		result.lo = (val.lo >>> count) | ((val.hi << (32 - count)) & 0xffffffff);
	}
	else
	{
		result.hi = (val.lo >>> (count - 32)) | ((val.hi << (64 - count)) & 0xffffffff);
		result.lo = (val.hi >>> (count - 32)) | ((val.lo << (64 - count)) & 0xffffffff);
	}
	return result;
}

function shr64(val, count)
{
	const result = {};
	if (count < 32)
	{
		result.hi = val.hi >>> count;
		result.lo = val.lo >>> count | ((val.hi << (32 - count)) & 0xffffffff);
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
	ror64,
	xor64,
	shr64
};