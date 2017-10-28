const LOG_BASE = 7,
	BASE = 10e7,
	BASE_SQUARED = 10e14,
	MAX_INT_ARR = nativeToArray(Number.MAX_SAFE_INTEGER);

class BaseInteger
{
	get isNegative()
	{
		return this.sign;
	}

	get isPositive()
	{
		return !this.sign;
	}

	constructor(value)
	{
		this.value = value;
	}
}

class BigInteger extends BaseInteger
{
	constructor(value, sign)
	{
		super(value);
		this._sign = sign;
	}

	toString()
	{
		const value = this.value,
			zeros = "0000000";
		let pos = value.length, 
			str = String(value[--pos]),
			digit;
		
		while (--pos >= 0)
		{
			digit = String(value[pos]);
			str += zeros.substr(digit.length) + digit;
		}
		const sign = this.sign ? "-" : "";
		return sign + str;
	}

	get isNative()
	{
		return false;
	}

	get sign()
	{
		return this._sign;
	}

	get isZero()
	{
		return false;
	}

	get isEven()
	{
		return (this.value[0] & 1) === 0;
	}

	get isOdd()
	{
		return (this.value[0] & 1) === 1;
	}

	abs()
	{
		return new BigInteger(this.value, false);
	}

	negate()
	{
		return new BigInteger(this.value, !this.sign);
	}

	add(value)
	{
		const n = parse(value);
		if (this.sign !== n.sign)
		{
			return this.sub(n.negate());
		}
		const a = this.value,
			b = n.value;
		
		if (n.isNative)
		{
			return new BigInteger(addNative(a, Math.abs(b)), this.sign);
		}
		return new BigInteger(addAny(a, b), this.sign);
	}

	sub(value)
	{
		const n = parse(value);
		if (this.sign !== n.sign)
		{
			return this.add(n.negate());
		}
		const a = this.value,
			b = n.value;

		if (n.isNative)
		{
			return subtractNative(a, Math.abs(b), this.sign);
		}
		return subtractAny(a, b, this.sign);
	}

	mul(value)
	{
		const n = parse(value),
			a = this.value,
			sign = this.sign !== n.sign;
		let b = n.value;

		if (n.isNative)
		{
			switch (b)
			{
				case 0:
					return ZERO; // eslint-disable-line no-use-before-define
				case 1:
					return this;
				case -1:
					return this.negate();
			}
			const abs = Math.abs(b);
			if (abs < BASE)
			{
				return new BigInteger(multiplyNative(a, abs), sign);
			}
			b = nativeToArray(abs);
		}

		const result = useKaratsuba(a.length, b.length) ? multiplyKaratsuba(a, b) : multiply(a, b);
		return new BigInteger(result, sign);
	}

	_mulNative(a)
	{
		const value = a.value;
		switch (value)
		{
			case 0: return ZERO; // eslint-disable-line no-use-before-define
			case 1: return this;
			case -1: return this.negate();
		}
		return multiplyNativeAndArray(Math.abs(value), this.value, this.sign !== a.sign);
	}
}

class NativeInteger extends BaseInteger
{
	constructor(value)
	{
		super(value);
	}

	toString()
	{
		return this.value.toString();
	}

	get isNative()
	{
		return true;
	}

	get sign()
	{
		return this.value < 0;
	}

	get isZero()
	{
		return this.value === 0;
	}

	get isEven()
	{
		return (this.value & 1) === 0;
	}

	get isOdd()
	{
		return (this.value & 1) === 1;
	}

	abs()
	{
		return new NativeInteger(Math.abs(this.value));
	}

	negate()
	{
		return new NativeInteger(-this.value);
	}

	add(value)
	{
		const n = parse(value);
		if (this.sign !== n.sign)
		{
			return this.sub(n.negate());
		}
		const a = this.value;
		let b = n.value;

		if (n.isNative)
		{
			const result = a + b;
			if (Number.isSafeInteger(result))
			{
				return new NativeInteger(result);
			}
			b = nativeToArray(Math.abs(b));
		}
		return new BigInteger(addNative(b, Math.abs(a)), this.sign);
	}

	sub(value)
	{
		const n = parse(value);
		if (this.sign !== n.sign)
		{
			return this.add(n.negate());
		}
		const a = this.value,
			b = n.value;
		if (n.isNative)
		{
			return subtractNative(a, Math.abs(a), this.sign);
		}
		return subtractAny(a, b, this.sign);
	}

	mul(value)
	{
		const n = parse(value);
		return n._mulNative(this);
	}

	_mulNative(a)
	{
		const result = a.value * this.value;
		if (Number.isSafeInteger(result))
		{
			return new NativeInteger(result);
		}
		return multiplyNativeAndArray(Math.abs(a.value), nativeToArray(Math.abs(this.value)), this.sign !== a.sign);
	}
}

function bigint(value, radix = 10)
{
	return parse(value, radix);
}

const ZERO = bigint(0);

function compareAbs(a, b)
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

// Add a and b (BigInteger arrays), a.length >= b.length
function add(a, b)
{
	let carry = 0,
		i = 0;

	const arr = new Array(a.length);

	while (i < b.length)
	{
		const sum = a[i] + b[i] + carry;
		carry = sum >= BASE ? 1 : 0;
		arr[i++] = sum - carry * BASE;
	}

	while (i < a.length)
	{
		const sum = a[i] + carry;
		carry = sum === BASE ? 1 : 0;
		arr[i++] = sum - carry * BASE;
	}

	if (carry > 0)
	{
		arr.push(carry);
	}
	
	return arr;
}

function addAny(a, b)
{
	if (a.length >= b.length)
	{
		return add(a, b);
	}

	return add(b, a);
}

// Add BigInteger array a + Number b, 0 <= b < MAX_SAFE_INTEGER
function addNative(a, b)
{
	const arr = new Array(a.length);
	let i = 0,
		carry = b;

	while (i < a.length)
	{
		const sum = a[i] - BASE + carry;
		carry = Math.floor(sum / BASE);
		arr[i++] = sum - carry * BASE;
		carry++;
	}

	while (carry > 0)
	{
		arr[i++] = carry % BASE;
		carry = Math.floor(carry / BASE);
	}

	return arr;
}

function subtract(a, b)
{
	const arr = new Array(a.length);
	let borrow = 0,
		i = 0;

	while (i < b.length)
	{
		let difference = a[i] - borrow - b[i];
		if (difference < 0)
		{
			difference += BASE;
			borrow = 1;
		}
		else
		{
			borrow = 0;
		}
		arr[i++] = difference;
	}

	while (i < a.length)
	{
		let difference = a[i] - borrow;
		if (difference < 0)
		{
			difference += BASE;
		}
		arr[i++] = difference;
		if (difference >= 0)
		{
			break;
		}
	}

	while (i < a.length)
	{
		arr[i] = a[i];
		i++;
	}

	return trimArray(arr);
}

function subtractAny(a, b, sign)
{
	let value;
	if (compareAbs(a, b) >= 0)
	{
		value = subtract(a, b);
	}
	else
	{
		value = subtract(b, a);
		sign = !sign;
	}
	value = arrayToNative(value);
	if (typeof value === "number")
	{
		if (sign)
		{
			value = -value;
		}
		return new NativeInteger(value);
	}
	return new BigInteger(value, sign);
}

function subtractNative(a, b, sign)
{
	const arr = new Array(a.length);
	let i = 0,
		carry = -b;
	while (i < a.length)
	{
		let difference = a[i] + carry;
		carry = Math.floor(difference / BASE);
		difference %= BASE;
		arr[i++] = difference < 0 ? difference + BASE : difference;
	}

	let result = arrayToNative(arr);
	if (typeof result === "number")
	{
		if (sign)
		{
			result = -result;
		}
		return new NativeInteger(result);
	}
	return new BigInteger(result, sign);
}

function multiply(a, b)
{
	const lengthA = a.length,
		lengthB = b.length;
	
	const lengthTotal = lengthA + lengthB;
	const arr = new Array(lengthTotal);
	arr.fill(0);

	for (let i = 0; i < lengthA; ++i)
	{
		const iA = a[i];
		for (let j = 0; j < lengthB; ++j)
		{
			const jB = b[j];
			const product = iA * jB + arr[i + j];
			const carry = Math.floor(product / BASE);
			arr[i + j] = product - carry * BASE;
			arr[i + j + 1] += carry;
		}
	}

	return trimArray(arr);
}

function multiplyNative(a, b)
{
	const arr = new Array(a.length);
	let i = 0,
		carry = 0;
	while (i < a.length)
	{
		const product = a[i] * b + carry;
		carry = Math.floor(product / BASE);
		arr[i++] = product - carry * BASE;
	}

	while (carry > 0)
	{
		arr[i++] = carry % BASE;
		carry = Math.floor(carry / BASE);
	}
	
	return arr;
}

function shiftLeft(x, n)
{
	const arr = [];
	while (n-- > 0)
	{
		arr.push(0);
	}
	return arr.concat(x);
}

function multiplyKaratsuba(x, y)
{
	let n = Math.max(x.length, y.length);

	if (n <= 30)
	{
		return multiply(x, y);
	}
	n = Math.ceil(n / 2);

	const b = x.slice(n),
		a = x.slice(0, n),
		d = y.slice(n),
		c = y.slice(0, n);

	const ac = multiplyKaratsuba(a, c),
		bd = multiplyKaratsuba(b, d),
		abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));
	
	const product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
	return trimArray(product);
}

function useKaratsuba(lengthA, lengthB)
{
	return -0.012 * lengthA - 0.012 * lengthB + 0.000015 * lengthA * lengthB > 0;
}

function multiplyNativeAndArray(a, b, sign)
{
	if (a < BASE)
	{
		return new BigInteger(multiplyNative(b, a), sign);
	}
	return new BigInteger(multiply(b, nativeToArray(a)), sign);
}

function trimArray(arr)
{
	let i = arr.length;
	while (arr[i - 1] === 0)
	{
		i--;
	}

	arr.length = i;
	return arr;
}

function nativeToArray(n)
{
	if (n < BASE)
	{
		return [n];
	}
	if (n < BASE_SQUARED)
	{
		return [n % BASE, Math.floor(n / BASE)];
	}

	return [n % BASE, Math.floor(n / BASE) % BASE, Math.floor(n / BASE_SQUARED)];
}

function arrayToNative(arr)
{
	trimArray(arr);
	const length = arr.length;
	if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0)
	{
		switch (length)
		{
			case 0: return 0;
			case 1: return arr[0];
			case 2: return arr[0] + arr[1] * BASE;
			default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
		}
	}
	return arr;
}

function parse(value, radix = 10)
{
	if (radix !== 10)
	{
		return parseBase(value, radix);
	}

	if (typeof value === "string")
	{
		return parseString(value);
	}

	if (typeof value === "number")
	{
		return parseNumber(value);
	}

	return value;
}

function parseBase(value, radix)
{
	
}

function parseNumber(value)
{
	if (Number.isSafeInteger(value))
	{
		return new NativeInteger(value);
	}

	return parseString(value.toString());
}

function parseString(value)
{
	let sign = false;
	switch (value[0])
	{
		case "+":
			value = value.substr(1);
			break;
		case "-":
			value = value.substr(1);
			sign = true;
			break;
	}

	const parts = value.split(/e/i);
	if (parts.length > 2)
	{
		throw new Error(`Invalid integer: ${value}`);
	}

	if (parts.length === 2)
	{
		let base = parts[0];
		let strExp = parts[1];

		if (strExp[0] === "+")
		{
			strExp = strExp.substr(1);
		}
		
		let exp = Number(strExp);
		if (!Number.isSafeInteger(exp))
		{
			throw new Error(`Invalid integer: ${exp} is not a valid exponent.`);
		}

		const decimalPosition = base.indexOf(".");
		if (decimalPosition >= 0)
		{
			exp -= base.length - decimalPosition - 1;
			base = base.substr(0, decimalPosition) + base.substr(decimalPosition + 1);
		}

		if (exp < 0)
		{
			throw new Error(`Invalid integer: Exponent cannot be negative (${exp})`);
		}

		base += "0".repeat(exp);
		value = base;
	}

	const isValid = /^[0-9]+$/.test(value);
	if (!isValid)
	{
		throw new Error(`Invalid integer: ${value}`);
	}

	const arr = [];
	let end = value.length,
		start = end - LOG_BASE;
	while (end > 0)
	{
		arr.push(Number(value.slice(start, end)));
		start -= LOG_BASE;
		if (start < 0)
		{
			start = 0;
		}
		end -= LOG_BASE;
	}
	return new BigInteger(trimArray(arr), sign);
}

export default bigint;