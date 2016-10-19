import { Transform } from "../transforms";

// Polynomials are in reverse notation for reflected variants! (normal notation for normal variants)
const CRC_VARIANTS = {
	"CRC-16arc":	{ polynomial: 0xa001,		init: 0x0000, 		xorOut: 0x0000, 	width: 16, reflected: true },
	"CRC-16kermit": { polynomial: 0x8408, 		init: 0x0000, 		xorOut: 0x0000, 	width: 16, reflected: true },
	"CRC-16x25": 	{ polynomial: 0x8408, 		init: 0xffff, 		xorOut: 0xffff, 	width: 16, reflected: true },
	"CRC-16xmodem":	{ polynomial: 0x1021, 		init: 0x0000, 		xorOut: 0x0000, 	width: 16 },

	"CRC-24": 		{ polynomial: 0x864cfb, 	init: 0xb704ce, 	xorOut: 0x000000, 	width: 24 },

	"CRC-32": 		{ polynomial: 0xedb88320, 	init: 0xffffffff, 	xorOut: 0xffffffff, width: 32, reflected: true },
	"CRC-32bzip2": 	{ polynomial: 0x04c11db7, 	init: 0xffffffff, 	xorOut: 0xffffffff, width: 32 },
	"CRC-32C": 		{ polynomial: 0x82f63b78, 	init: 0xffffffff, 	xorOut: 0xffffffff, width: 32, reflected: true },
	"CRC-32D": 		{ polynomial: 0xd419cc15, 	init: 0xffffffff, 	xorOut: 0xffffffff, width: 32, reflected: true },
	"CRC-32mpeg2":	{ polynomial: 0x04c11db7, 	init: 0xffffffff, 	xorOut: 0x00000000, width: 32 },
	"CRC-32posix":	{ polynomial: 0x04c11db7, 	init: 0x00000000, 	xorOut: 0xffffffff, width: 32 },
	"CRC-32Q": 		{ polynomial: 0x814141AB, 	init: 0x00000000, 	xorOut: 0x00000000, width: 32 }
};

const CRC_VARIANT_NAMES = {
	"CRC-16 (ARC)"			: "CRC-16arc",
	"CRC-16 (KERMIT)"		: "CRC-16kermit",
	"CRC-16 (X-25)"			: "CRC-16x25",
	"CRC-16 (XMODEM)"		: "CRC-16xmodem",

	"CRC-24 (OpenPGP)"		: "CRC-24",
	
	"CRC-32"				: "CRC-32",
	"CRC-32bzip2 (bzip2)"	: "CRC-32bzip2",
	"CRC-32 (Castagnoli)"	: "CRC-32C",
	"CRC-32D"				: "CRC-32D",
	"CRC-32 (MPEG-2)"		: "CRC-32mpeg2",
	"CRC-32 (Posix)"		: "CRC-32posix",
	"CRC-32Q"				: "CRC-32Q"
};

const TABLE_CACHE = {};

class CrcTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Checksum")
			.addOption("variant", "Variant", "CRC-32", { type: "select", values: CRC_VARIANT_NAMES });
	}

	makeCrcTable(polynomial, width)
	{
		const result = [];
		const shl = width - 8;
		const mask = 1 << (width - 1);
		for (let n = 0; n < 256; n++)
		{
			let c = n << shl;
			for (let k = 0; k < 8; k++)
			{
				c = (c & mask) ? (polynomial ^ (c << 1)) : (c << 1);
			}
			result[n] = c;
		}
		return result;
	}

	makeReflectedCrcTable(polynomial)
	{
		const result = [];
		for (let n = 0; n < 256; n++)
		{
			let c = n;
			for (let k = 0; k < 8; k++)
			{
				c = (c & 1) ? (polynomial ^ (c >>> 1)) : (c >>> 1);
			}
			result[n] = c;
		}
		return result;
	}

	makeOutMask(width)
	{
		// This avoids << 32 (which is the equivalent of << 0 in javascript)
		return (((1 << (width - 1)) - 1 ) << 1) | 1;
	}

	getTable(name, variant)
	{
		let result = TABLE_CACHE[name];
		if (!result)
		{
			result = TABLE_CACHE[name] = variant.reflected ? 
				this.makeReflectedCrcTable(variant.polynomial) : 
				this.makeCrcTable(variant.polynomial, variant.width);
		}
		return result;
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);
		const variant = CRC_VARIANTS[options.variant];
		
		const crcTable = this.getTable(options.variant, variant);
		const maskOut = this.makeOutMask(variant.width);
		let crc = variant.init;
		if (variant.reflected)
		{
			for (let i = 0; i < bytes.length; i++)
			{
				crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
			}
		}
		else
		{
			const shr = variant.width - 8;
			for (let i = 0; i < bytes.length; i++)
			{
				crc = crcTable[((crc >>> shr) ^ bytes[i]) & 0xff] ^ (crc << 8);
			}
		}
		crc = (crc ^ variant.xorOut) & maskOut;

		const result = [];
		for (let i = 0; i < variant.width / 8; i++)
		{
			result.unshift(crc & 0xff);
			crc >>>= 8;
		}
		return result;
	}
}

export {
	CrcTransform
};