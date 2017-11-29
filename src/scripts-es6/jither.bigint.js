const BASE = 16777216;

const RADICES = {
	2: { base: BASE, digitsPerPart: 24, zeroes: "000000000000000000000000", rx: /^[01]+$/ },
	8: { base: BASE, digitsPerPart: 8, zeroes: "00000000", rx: /^[0-7]+$/ },
	10: { base: 1e7, digitsPerPart: 7, zeroes: "0000000", rx: /^[0-9]+$/ },
	16: { base: BASE, digitsPerPart: 6, zeroes: "000000", rx: /^[0-9a-fA-F]+$/ }
};

class BigInteger
{
	get isOdd()
	{
		return this.value[0] % 2 !== 0;
	}

	get isEven()
	{
		return this.value[0] % 2 === 0;
	}

	get isZero()
	{
		return this.value.length === 1 && this.value[0] === 0;
	}

	get isPositive()
	{
		return !this.sign && !this.isZero;
	}

	get isNegative()
	{
		return this.sign;
	}

	constructor(value, sign = false)
	{
		this.value = value;
		this.sign = sign;
	}

	abs()
	{
		if (!this.sign)
		{
			return this;
		}
		return new BigInteger(this.value, true);
	}

	add(value)
	{
		value = bigint(value);
		if (this.sign !== value.sign)
		{
			return this.sub(value.neg());
		}
		const a = this.value,
			b = value.value;
		
		return new BigInteger(add(a, b), this.sign);
	}

	sub(value)
	{
		value = bigint(value);
		let sign = this.sign;
		if (sign !== value.sign)
		{
			return this.add(value.neg());
		}

		let a = this.value,
			b = value.value;
		
		if (compareValue(a, b) < 0)
		{
			sign = !sign;
			[a, b] = [b, a];
		}

		return new BigInteger(subtract(a, b), sign);
	}

	mul(value)
	{
		value = bigint(value);
		const sign = this.sign !== value.sign;

		const a = this.value,
			b = value.value;

		return new BigInteger(multiply(a, b), sign);
	}

	div(value)
	{
		value = bigint(value);
		
		return divMod(this, value).quotient;
	}

	mod(value)
	{
		value = bigint(value);
		return divMod(this, value).mod;
	}

	divMod(value)
	{
		value = bigint(value);
		return divMod(this, value);
	}

	prev()
	{
		return this.sub(1);
	}

	next()
	{
		return this.add(1);
	}

	isDivisibleBy(value)
	{
		value = bigint(value);
		return isDivisibleBy(this, value);
	}

	square()
	{
		return new BigInteger(square(this.value), false);
	}

	sqrt()
	{
		return sqrt(this);
	}

	pow(exp)
	{
		const n = bigint(exp);
		return pow(this, n);
	}

	powMod(exp, mod)
	{
		exp = bigint(exp);
		mod = bigint(mod);

		return powMod(this, exp, mod);
	}

	and(value)
	{
		value = bigint(value);
		return and(this, value);
	}

	or(value)
	{
		value = bigint(value);
		
		return or(this, value);
	}

	xor(value)
	{
		value = bigint(value);
		
		return xor(this, value);
	}

	not()
	{
		return new BigInteger(not(this.value), !this.sign);
	}

	neg()
	{
		return new BigInteger(this.value, !this.sign);
	}

	compare(value)
	{
		if (value === Infinity)
		{
			return -1;
		}

		if (value === -Infinity)
		{
			return 1;
		}

		value = bigint(value);

		if (this.sign !== value.sign)
		{
			return this.sign ? -1 : 1;
		}

		const a = this.value,
			b = value.value;
		
		return compareValue(a, b) * (this.sign ? -1 : 1);
	}

	eq(value)
	{
		return this.compare(value) === 0;
	}

	neq(value)
	{
		return this.compare(value) !== 0;
	}

	lt(value)
	{
		return this.compare(value) < 0;
	}

	leq(value)
	{
		return this.compare(value) <= 0;
	}

	gt(value)
	{
		return this.compare(value) > 0;
	}

	geq(value)
	{
		return this.compare(value) >= 0;
	}

	get isPrime()
	{
		const result = isSimplePrime(this);
		if (result !== null)
		{
			return result;
		}

		// TODO: Proper check (this is probabilistic)
		const a = [2, 3, 5, 7, 11, 13, 17, 19];
		const n = this.abs();
		const prev = this.prev();
		
		let b = prev;
		while (b.isEven)
		{
			b = b.div(2);
		}

		for (let i = 0; i < a.length; i++)
		{
			let x = bigint(a[i]).powMod(b, n);
			if (x.eq(1) || x.eq(prev))
			{
				continue;
			}
			let t = true;
			let d = b;
			while (t && d.lt(prev))
			{
				x = x.square().mod(n);
				if (x.eq(prev))
				{
					t = false;
				}
				d = d.mul(2);
			}
			if (t)
			{
				return false;
			}
		}
		return true;
	}

	toNumber()
	{
		let result = 0;
		for (let i = 0; i < this.value.length; i++)
		{
			result *= BASE;
			result += this.value[i];
		}

		if (this.sign)
		{
			result = -result;
		}

		if (result > Number.MAX_SAFE_INTEGER || result < Number.MIN_SAFE_INTEGER)
		{
			return null;
		}

		return result;
	}

	toBytes()
	{
		const length = this.value.length * 3;
		const result = new Uint8Array(length);
		const last = this.value[this.value.length - 1];
		
		let start = 0;
		if (last < 0xffff)
		{
			start++;
		}
		if (last < 0xff)
		{
			start++;
		}

		let index = 0;
		for (let i = this.value.length - 1; i >= 0; i--)
		{
			const part = this.value[i];
			result[index++] = part >>> 16;
			result[index++] = part >>> 8;
			result[index++] = part;
		}

		return result.subarray(start, length);
	}

	toInt32sBE()
	{
		const result = [];
		let source = 0;

		let word = 0;
		let wordPos = 0;
		while (source < this.value.length)
		{
			const part = this.value[source++];
			for (let i = 0; i < 24; i += 8)
			{
				word |= ((part >> i) & 0xff) << wordPos;
				wordPos += 8;
				if (wordPos > 24)
				{
					result.unshift(word);
					wordPos = 0;
					word = 0;
				}
			}
		}
		if (word !== 0)
		{
			result.unshift(word);
		}
		return result;
	}

	toString(radix = 10)
	{
		const radixInfo = RADICES[radix];
		if (!radixInfo)
		{
			throw new Error(`Unsupported radix: ${radix}`);
		}
		const base = radixInfo.base;
		const digitsPerPart = radixInfo.digitsPerPart;
		const zeroes = radixInfo.zeroes;

		const buffer = new Uint32Array(this.value);
		let startIndex = buffer.length - 1;
		let result = "";
		while (startIndex >= 0)
		{
			let remainder = 0;
			for (let index = startIndex; index >= 0; index--)
			{
				const dividend = buffer[index] + (remainder * BASE);
				remainder = dividend % base;
				const quotient = (dividend / base) >> 0;
				buffer[index] = quotient;
			}

			// Next round, skip all parts that have become 0:
			while (startIndex >= 0 && buffer[startIndex] === 0)
			{
				startIndex--;
			}

			let digits = remainder.toString(radix);
			// Add leading zeroes, unless this is the last (left-most) part:
			if (startIndex >= 0)
			{
				digits = (zeroes + digits).substr(-digitsPerPart);
			}
			result = digits + result;
		}
		return (this.sign ? "-" : "") + result;
	}
}

// Predefine some often used integers as constants:
const Integers = new Map();

for (let i = -1; i <= 20; i++)
{
	const val = new BigInteger(Uint32Array.from([Math.abs(i)]), i < 0);
	val._predefined = true;
	Integers.set(i, val);
}

// arr: array of 24-bit parts
function trimArray(arr)
{
	let len = arr.length - 1;
	while (len > 0 && arr[len] === 0)
	{
		len--;
	}
	return arr.subarray(0, len + 1);
}

// a, b: array of 24-bit parts
function add(a, b)
{
	if (a.length < b.length)
	{
		[a, b] = [b, a];
	}

	const result = new Uint32Array(a.length + 1);
	let carry = 0;
	let i = 0;
	for (i = 0; i < b.length; i++)
	{
		const sum = a[i] + b[i] + carry;
		carry = sum >= BASE ? 1 : 0;
		result[i] = sum - carry * BASE;
	}
	while (i < a.length)
	{
		const sum = a[i] + carry;
		carry = sum === BASE ? 1 : 0;
		result[i++] = sum - carry * BASE;
	}
	if (carry > 0)
	{
		result[i] = carry;
		return result;
	}
	return result.subarray(0, a.length);
}

// a, b: array of 24-bit parts
function subtract(a, b)
{
	let i = 0;
	let borrow = 0;
	let result = new Uint32Array(a.length);

	while (i < b.length)
	{
		let diff = a[i] - borrow - b[i];
		if (diff < 0)
		{
			diff += BASE;
			borrow = 1;
		}
		else
		{
			borrow = 0;
		}
		result[i++] = diff;
	}

	while (i < a.length)
	{
		const diff = a[i] - borrow;
		if (diff >= 0)
		{
			result[i++] = diff;
			break;
		}

		result[i++] = diff + BASE;
	}

	while (i < a.length)
	{
		result[i] = a[i];
		i++;
	}

	result = trimArray(result);

	return result;
}

// x: array of 24-bit parts
// n: number
function shiftLeft(x, n)
{
	const result = new Uint32Array(x.length + n);
	result.set(x, n);
	return result;
}

// a, b: array of 24-bit parts
function multiplyKaratsuba(a, b)
{
	let n = Math.max(a.length, b.length); 

	if (n <= 30)
	{
		return multiply(a, b);
	}

	n = Math.ceil(n / 2);

	const x = a.subarray(0, n),
		y = a.subarray(n),
		z = b.subarray(0, n),
		w = b.subarray(n);
	
	const xz = multiplyKaratsuba(x, z);
	const yw = multiplyKaratsuba(y, w);
	const xyzw = multiplyKaratsuba(add(x, y), add(z, w));

	const result = add(add(xz, shiftLeft(subtract(subtract(xyzw, xz), yw), n)), shiftLeft(yw, 2 * n));
	return trimArray(result);
}

// a, b: array of 24-bit parts
function multiply(a, b)
{
	if (Math.max(a.length, b.length) > 30)
	{
		return multiplyKaratsuba(a, b);
	}

	const result = new Uint32Array(a.length + b.length);

	for (let i = 0; i < a.length; i++)
	{
		const ai = a[i];
		for (let j = 0; j < b.length; j++)
		{
			const bj = b[j];
			const product = ai * bj + result[i + j];
			const carry = (product / BASE) >> 0;
			result[i + j] = product - carry * BASE;
			result[i + j + 1] += carry;
		}
	}

	return trimArray(result);
}

// a: array of 24-bit parts
// b: number
function multiplySmall(a, b)
{
	const result = new Array(a.length);
	let carry = 0;
	let i;

	for (i = 0; i < a.length; i++)
	{
		const product = a[i] * b + carry;
		carry = Math.floor(product / BASE);
		result[i] = product - carry * BASE;
	}
	while (carry > 0)
	{
		result[i++] = carry % BASE;
		carry = Math.floor(carry / BASE);
	}
	return Uint32Array.from(result);
}

// a, b: array of 24-bit parts
function _divMod(a, b)
{
	const aLength = a.length,
		bLength = b.length;
	const result = new Array(b.length);
	let multiplier = b[b.length - 1];
	const lambda = Math.ceil(BASE / (2 * multiplier));
	const remainder = Array.from(multiplySmall(a, lambda));
	const divisor = Array.from(multiplySmall(b, lambda));

	if (remainder.length <= aLength)
	{
		remainder.push(0);
	}
	divisor.push(0);

	multiplier = divisor[bLength - 1];

	for (let shift = aLength - bLength; shift >= 0; shift--)
	{
		let quotientPart = BASE - 1;
		if (remainder[shift + bLength] !== multiplier)
		{
			quotientPart = ((remainder[shift + bLength] * BASE + remainder[shift + bLength - 1]) / multiplier) >> 0;
		}
		let carry = 0;
		let borrow = 0;
		const l = divisor.length;
		for (let i = 0; i < l; i++)
		{
			carry += quotientPart * divisor[i];
			const q = (carry / BASE) >> 0;
			borrow += remainder[shift + i] - (carry - q * BASE);
			carry = q;

			if (borrow < 0)
			{
				remainder[shift + i] = borrow + BASE;
				borrow = -1;
			}
			else
			{
				remainder[shift + i] = borrow;
				borrow = 0;
			}
		}
		while (borrow !== 0)
		{
			quotientPart--;
			carry = 0;
			for (let i = 0; i < l; i++)
			{
				carry += remainder[shift + i] - BASE + divisor[i];
				if (carry < 0)
				{
					remainder[shift + i] = carry + BASE;
					carry = 0;
				}
				else
				{
					remainder[shift + i] = carry;
					carry = 1;
				}
			}
			borrow += carry;
		}
		result[shift] = quotientPart;
	}
	const mod = divModSmall(remainder, lambda).quotient;
	const quotient = trimArray(Uint32Array.from(result));
	return { quotient, mod };
}

// a: array of 24-bit parts
// lambda: number
function divModSmall(value, lambda)
{
	const length = value.length;
	let quotient = new Uint32Array(length);
	let remainder = 0;
	for (let i = length - 1; i >= 0; --i)
	{
		const divisor = remainder * BASE + value[i];
		const q = Math.trunc(divisor / lambda);
		remainder = divisor - q * lambda;
		quotient[i] = q | 0;
	}

	quotient = trimArray(quotient);
	const mod = remainder | 0;
	return { quotient, mod };
}

// a, b: BigInteger
function divMod(a, b)
{
	if (b.isZero)
	{
		throw new Error("Division by zero");
	}

	const comparison = compareValue(a.value, b.value);
	if (comparison === -1)
	{
		return { quotient: Integers.get(0), mod: a };
	}

	const qSign = a.sign !== b.sign;
	if (comparison === 0)
	{
		return { quotient: qSign ? Integers.get(-1) : Integers.get(1), mod: Integers.get(0) };
	}

	const { quotient, mod } = _divMod(a.value, b.value);
	
	const mSign = a.sign;
	
	return { quotient: new BigInteger(quotient, qSign), mod: new BigInteger(mod, mSign) };
}

// a: array of 24-bit parts
function square(a)
{
	const result = new Uint32Array(a.length * 2);
	
	for (let i = 0; i < a.length; i++)
	{
		const ai = a[i];
		for (let j = 0; j < a.length; j++)
		{
			const aj = a[j];
			const product = ai * aj + result[i + j];
			const carry = (product / BASE) >> 0;
			result[i + j] = product - carry * BASE;
			result[i + j + 1] += carry;
		}
	}

	return trimArray(result);
}

// a: BigInteger
function _bitCount(a)
{
	const v = a.value;
	// 24 bits per entry, except possibly last entry:
	return (v.length - 1) * 24 + (Math.log2(v[v.length - 1]) >> 0) + 1;
}

// a: BigInteger
function sqrt(a)
{
	const comparison = a.compare(0);
	if (comparison < 0)
	{
		throw new Error(`No imaginary numbers. Can't find square root of negative integer: ${a}`);
	}
	if (comparison === 0)
	{
		return Integers.get(0);
	}

	// Newton's method
	const bitCount = _bitCount(a);
	let x = bigint(2).pow(Math.ceil(bitCount / 2));
	for (;;)
	{
		const y = x.add(a.div(x)).div(2);
		if (y.geq(x))
		{
			return x;
		}
		x = y;
	}
}

// a, exp: BigInteger
function pow(a, exp)
{
	const aNum = a.toNumber();
	let expNum = exp.toNumber();

	if (expNum === 0)
	{
		return Integers.get(1);
	}
	if (aNum === 0)
	{
		return Integers.get(0);
	}
	if (aNum === 1)
	{
		return Integers.get(1);
	}
	if (aNum === -1)
	{
		return expNum % 2 === 0 ? Integers.get(1) : Integers.get(-1);
	}
	if (exp.sign)
	{
		throw new Error(`Negative exponent ${exp} wouldn't result in an integer.`);
	}

	if (expNum === null)
	{
		throw new Error(`Exponent ${exp} is too large.`);
	}

	let y = Integers.get(1);
	for (;;)
	{
		if ((expNum & 1) === 1)
		{
			y = y.mul(a);
			--expNum;
		}
		if (expNum === 0)
		{
			break;
		}
		expNum >>>= 1;
		a = a.square();
	}
	return y;
}

// a, exp, mod: BigInteger
function powMod(a, exp, mod)
{
	if (mod.isZero)
	{
		throw new Error("Cannot calculate powMod with modulus 0");
	}
	let result = Integers.get(1),
		base = a.mod(mod);
	
	while (exp.isPositive)
	{
		if (base.isZero)
		{
			return Integers.get(0);
		}
		if (exp.isOdd)
		{
			result = result.mul(base).mod(mod);
		}
		exp = exp.div(2);
		base = base.square().mod(mod);
	}
	return result;
}

// p: BigInteger
function isSimplePrime(p)
{
	p = p.abs();
	const value = p.value;
	if (value.length === 1)
	{
		const v = value[0];
		if (v === 1)
		{
			return false;
		}
		if (v === 2 || v === 3 || v === 5)
		{
			return true;
		}
	}
	if (p.isEven || p.isDivisibleBy(3) || p.isDivisibleBy(5))
	{
		return false;
	}
	if (p.lt(25))
	{
		return true;
	}
	return null;
}

// a, b: BigInteger
function isDivisibleBy(a, b)
{
	const bv = b.value;
	if (bv.length === 1)
	{
		const a0 = a.value[0];
		const b0 = bv[0];
		switch (b0)
		{
			// Divisibility shortcuts for hexadecimal numbers:
			case 0: return false;
			case 1: return true;
			case 2: return a0 & 0b0001 === 0; // Shortcut: The last hex digit is even
			case 3: return _partSum(a) % 3 === 0; // Shortcut: Digit sum is divisible by 3
			case 4: return a0 & 0b0011 === 0; // Shortcut: The last hex digit is 0, 4, 8 or C
			case 5: return _partSum(a) % 5 === 0; // Shortcut: Digit sum is divisible by 5
			case 6: return (a0 & 0b0001 === 0) && (_partSum(a) % 3 === 0); // Shortcut: Divisible by 2 and 3
			// case 7: // Shortcut: Multiply last digit by 3, subtract from full number. Iterate. Result is divisible by 7.
			case 8: return a0 & 0b0111 === 0; // Shortcut: The last hex digit is 0 or 8
			// case 9: // No shortcut
			case 10: return (a0 & 0b0001 === 0) && (_partSum(a) % 5 === 0); // Shortcut: Digit sum is divisible by 2 and 5
			case 15: return _partSum(a) % 15 === 0; // Shortcut: Digit sum is divisible by 15
			case 16: return a0 & 0b1111 === 0; // Shortcut: The last hex digit is 0
			//case 17: // Shortcut: Odd position digits - even position digits is divisible by 11
		}
	}
	return a.mod(b).eq(Integers.get(0));
}

// a: BigInteger
function _partSum(a)
{
	const v = a.value;
	let result = 0;
	for (let i = 0; i < v.length; i++)
	{
		result += v[i];
	}
	return result;
}

// a: array of 24-bit parts
function makeTwosComplement(a)
{
	const result = new Uint32Array(a.length);

	let addOne = true;
	for (let i = 0; i < result.length; i++)
	{
		// Two's complement: (NOT a) + 1. Remember we're dealing in 24 bit words, so mask the left-most byte:
		let part = (~a[i]) & 0x00ffffff;
		if (addOne)
		{
			part++;
		}
		// Only add 1 to least significant word (that doesn't overflow):
		if (part !== 0x1000000)
		{
			addOne = false;
		}
		else
		{
			// Remove overflowing 1
			part &= 0x00ffffff;
		}

		result[i] = part;
	}
	return result;
}

// a, b: BigInteger
function bitwise(a, b, func)
{
	if (a.value.length < b.value.length)
	{
		[a, b] = [b, a];
	}

	let aval = a.value,
		bval = b.value;
	
	if (a.sign)
	{
		aval = makeTwosComplement(aval);
	}
	
	if (b.sign)
	{
		bval = makeTwosComplement(bval);
	}
	
	let result = new Uint32Array(aval.length);
	let i = 0;
	while (i < bval.length)
	{
		result[i] = func(aval[i], bval[i]);
		i++;
	}

	// Make length of a and b "match up".
	// If b is negative, use 0xffffff as b's value for the rest of a, otherwise use 0:
	const missingB = b.sign ? 0xffffff : 0;
	while (i < aval.length)
	{
		result[i] = func(aval[i], missingB);
		i++;
	}

	const sign = Boolean(func(a.sign, b.sign));
	if (sign)
	{
		// Convert back from two's complement to absolute value:
		result = makeTwosComplement(result);
	}
	return new BigInteger(trimArray(result), sign);
}

// a, b: BigInteger
function and(a, b)
{
	return bitwise(a, b, (aw, bw) => aw & bw);
}

// a, b: BigInteger
function or(a, b)
{
	return bitwise(a, b, (aw, bw) => aw | bw);
}

// a, b: BigInteger
function xor(a, b)
{
	return bitwise(a, b, (aw, bw) => aw ^ bw);
}

// a: array of 24-bit parts
function not(a)
{
	const result = new Uint32Array(a.length);
	let i = 0;
	while (i < a.length - 1)
	{
		result[i] = (~a[i]) & 0xffffff;
		i++;
	}

	const ai = a[i];
	const mask = (1 << Math.floor(Math.log2(ai)) + 1) - 1;
	result[i] = (~ai) & mask;

	return trimArray(result);
}

// a, b: array of 24-bit parts
function compareValue(a, b)
{
	if (a.length !== b.length)
	{
		return a.length > b.length ? 1 : -1;
	}

	for (let i = a.length - 1; i >= 0; i--)
	{
		if (a[i] !== b[i])
		{
			return a[i] > b[i] ? 1 : -1;
		}
	}
	return 0;
}

function bigint(value, radix = 10)
{
	if (typeof value === "string")
	{
		return parseString(value, radix);
	}
	if (typeof value === "number")
	{
		return parseNumber(value);
	}

	return value;
}

function parseString(value, radix)
{
	value = value.replace(/[.,_ ]/g, "");
	let sign = false;
	if (value[0] === "-")
	{
		value = value.substr(1);
		sign = true;
	}

	// Prefix trumps specified radix
	const prefix = value.substr(0, 2);
	switch (prefix)
	{
		case "0b":
		case "0B":
			// If radix is 16, 0b is part of the value, not a prefix
			if (radix !== 16)
			{
				radix = 2;
				value = value.substr(2);
			}
			break;
		case "0o":
		case "0O":
			radix = 8;
			value = value.substr(2);
			break;
		case "0x":
		case "0X":
			radix = 16;
			value = value.substr(2);
			break;
		// no default
	}

	if (radix === 10)
	{
		return parseDecimal(value, sign);
	}
	// 2, 8 and 16 bits all map exactly to 3 bytes/24 bits:
	return parseBase(value, radix, sign);
}

function parseDecimal(value, sign)
{
	if (!/^[0-9]+$/.test(value))
	{
		throw new Error(`Invalid base 10 integer: ${value}`);
	}

	const len = value.length;

	// Get predefined integer:
	if (len <= 7)
	{
		let v = parseInt(value, 10);
		if (sign)
		{
			v = -v;
		}
		if (Integers.has(v))
		{
			return Integers.get(v);
		}
	}

	// We use an untyped array here. Logarithmic calculation of array length will sometimes fail due to rounding errors
	const result = [];

	const parts = [];
	for (let end = len; end > 0; end -= 7)
	{
		let start = end - 7;
		if (start < 0)
		{
			start = 0;
		}

		parts.unshift(parseInt(value.substring(start, end), 10));
	}

	let partsRemaining = parts.length;
	let resultPosition = 0;
	while (partsRemaining > 0)
	{
		let current = 0;
		let position = 0;
		for (let i = 0; i < partsRemaining; i++)
		{
			current = current * 1e7 + parts[i];
			if (current >= BASE)
			{
				parts[position++] = (current / BASE) >> 0;
				current %= BASE;
			}
			else if (position > 0)
			{
				parts[position++] = 0;
			}
		}
		partsRemaining = position;
		result[resultPosition++] = current;
	}

	return new BigInteger(Uint32Array.from(result), sign);
}

function parseBase(value, radix, sign)
{
	const radixInfo = RADICES[radix];
	if (!radixInfo)
	{
		throw new Error(`Unsupported radix: ${radix}`);
	}

	if (!radixInfo.rx.test(value))
	{
		throw new Error(`Invalid base ${radix} integer: ${value}`);
	}
	
	const len = value.length;
	const digitsPerPart = radixInfo.digitsPerPart;

	// Get predefined integer:
	if (len <= digitsPerPart)
	{
		let v = parseInt(value, radix);
		if (sign)
		{
			v = -v;
		}
		if (Integers.has(v))
		{
			return Integers.get(v);
		}
	}

	const result = new Uint32Array(Math.ceil(len / digitsPerPart));
	let index = 0;
	for (let end = len; end > 0; end -= digitsPerPart)
	{
		let start = end - digitsPerPart;
		if (start < 0)
		{
			start = 0;
		}
		result[index++] = parseInt(value.substring(start, end), radix);
	}

	return new BigInteger(result, sign);
}

function parseNumber(value)
{
	if (Math.trunc(value) !== value)
	{
		throw new Error(`Invalid integer: ${value}`);
	}

	// Get predefined integer:
	if (Integers.has(value))
	{
		return Integers.get(value);
	}

	const result = [];
	const sign = value < 0;
	value = Math.abs(value);

	if (value === 0)
	{
		result.push(0);
	}
	else
	{
		while (value > 0)
		{
			result.push(value & 0xffffff);
			value = Math.floor(value / BASE);
		}
	}

	return new BigInteger(Uint32Array.from(result), sign);
}

export default bigint;