class Int64
{
	constructor(hi, lo)
	{
		if (typeof lo === "undefined")
		{
			// 32 bit input in first parameter
			this.lo = hi;
		}
		else
		{
			this.hi = hi;
			this.lo = lo;
		}
	}

	clone()
	{
		return new Int64(this.hi, this.lo);
	}

	add(...terms)
	{
		const len = terms.length;

		let r00 = this.lo & 0xffff,
			r16 = this.lo >>> 16,
			r32 = this.hi & 0xffff, 
			r48 = this.hi >>> 16;

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

		this.hi = (r48 << 16) | r32;
		this.lo = (r16 << 16) | r00;
		return this;
	}

	and(...terms)
	{
		const len = terms.length;
		for (let i = 0; i < len; i++)
		{
			const term = terms[i];
			this.lo &= term.lo;
			this.hi &= term.hi;
		}
		return this;
	}

	or(...terms)
	{
		const len = terms.length;
		for (let i = 0; i < len; i++)
		{
			const term = terms[i];
			this.lo |= term.lo;
			this.hi |= term.hi;
		}
		return this;
	}

	mul(factor)
	{
		const
			a48 = this.hi >>> 16,
			a32 = this.hi & 0xffff,
			a16 = this.lo >>> 16,
			a00 = this.lo & 0xffff,

			b48 = factor.hi >>> 16,
			b32 = factor.hi & 0xffff,
			b16 = factor.lo >>> 16,
			b00 = factor.lo & 0xffff;

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

		this.hi = (r48 << 16) | r32;
		this.lo = (r16 << 16) | r00;

		return this;
	}

	not()
	{
		this.hi = ~this.hi;
		this.lo = ~this.lo;
		
		return this;
	}

	rol(count)
	{
		if (count > 0)
		{
			const lo = this.lo;
			const hi = this.hi;
			if (count === 32)
			{
				// Javascript can shift at most 31 bits
				// Besides, this is simpler:
				this.hi = lo;
				this.lo = hi;
			}
			else if (count < 32)
			{
				this.hi = (hi << count) | (lo >>> (32 - count));
				this.lo = (lo << count) | (hi >>> (32 - count));
			}
			else
			{
				this.hi = (lo << (count - 32)) | (hi >>> (64 - count));
				this.lo = (hi << (count - 32)) | (lo >>> (64 - count));
			}
		}
		return this;
	}

	ror(count)
	{
		if (count > 0)
		{
			const lo = this.lo;
			const hi = this.hi;
			if (count === 32)
			{
				// Javascript can shift at most 31 bits
				// Besides, this is simpler:
				this.hi = lo;
				this.lo = hi;
			}
			else if (count < 32)
			{
				this.hi = (hi >>> count) | (lo << (32 - count));
				this.lo = (lo >>> count) | (hi << (32 - count));
			}
			else
			{
				this.hi = (lo >>> (count - 32)) | (hi << (64 - count));
				this.lo = (hi >>> (count - 32)) | (lo << (64 - count));
			}
		}
		return this;
	}

	rol48(count)
	{
		count = count % 48;
		if (count > 0)
		{
			const lo = this.lo;
			const hi = this.hi & 0xffff;
			if (count <= 16)
			{
				this.hi = ((hi << count) | (lo >>> (32 - count))) & 0xffff;
				this.lo = ((lo << count) | (hi >>> (16 - count)));
			}
			else
			{
				throw Error("rol48 only supports up to 16 bit rotation for now.");
			}
		}
		return this;
	}

	ror48(count)
	{
		count = count % 48;
		if (count > 0)
		{
			const lo = this.lo;
			const hi = this.hi & 0xffff;
			if (count <= 16)
			{
				this.hi = ((hi >>> count) | (lo << (16 - count))) & 0xffff;
				this.lo = ((lo >>> count) | (hi << (32 - count)));
			}
			else
			{
				throw Error("ror48 only supports up to 16 bit rotation for now.");
			}
		}
		return this;
	}

	shl(count)
	{
		if (count > 0)
		{
			if (count < 32)
			{
				this.hi = this.hi << count | (this.lo >>> (32 - count));
				this.lo <<= this.lo;
			}
			else
			{
				this.hi = this.lo << (count - 32);
				this.lo = 0;
			}
		}
		return this;
	}

	shr(count)
	{
		if (count > 0)
		{
			if (count < 32)
			{
				this.lo = this.lo >>> count | (this.hi << (32 - count));
				this.hi >>>= count;
			}
			else
			{
				this.lo = this.hi >>> (count - 32);
				this.hi = 0;
			}
		}
		return this;
	}

	sub(term)
	{
		const termlo = (~term.lo) + 1;
		let termhi = (~term.hi);
		if (termlo === 0)
		{
			termhi++;
		}

		let r00 = ((this.lo & 0xffff) + (termlo & 0xffff)               ) & 0xffff;
		let r16 = ((this.lo >>> 16)   + (termlo   >>> 16) + (r00 >>> 16)) & 0xffff;
		let r32 = ((this.hi & 0xffff) + (termhi & 0xffff) + (r16 >>> 16)) & 0xffff;
		let r48 = ((this.hi >>> 16)   + (termhi   >>> 16) + (r32 >>> 16)) & 0xffff;

		this.hi = (r48 << 16) | r32;
		this.lo = (r16 << 16) | r00;

		return this;
	}

	xor(...terms)
	{
		const len = terms.length;

		for (let i = 0; i < len; i++)
		{
			const term = terms[i];
			this.lo ^= term.lo;
			this.hi ^= term.hi;
		}
		return this;
	}

	equals(other)
	{
		return (this.hi === other.hi) && (this.lo === other.lo);
	}
}

Int64.ZERO = new Int64(0);
Int64.ONE = new Int64(1);

export {
	Int64
};