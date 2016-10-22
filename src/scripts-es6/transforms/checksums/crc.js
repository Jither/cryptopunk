import { Transform, TransformError } from "../transforms";

// Polynomials are in reverse notation for reflected variants! (normal notation for normal variants)
const CRC_VARIANTS = {
	"crc-16-arc":    { name: "CRC-16 (ARC)",			polynomial: 0xa001,		init: 0x0000, 		xorOut: 0x0000, 	width: 16, reflected: true },
	"crc-16-kermit": { name: "CRC-16 (KERMIT)",			polynomial: 0x8408, 	init: 0x0000, 		xorOut: 0x0000, 	width: 16, reflected: true },
	"crc-16-x25": 	 { name: "CRC-16 (X-25)",			polynomial: 0x8408, 	init: 0xffff, 		xorOut: 0xffff, 	width: 16, reflected: true },
	"crc-16-xmodem": { name: "CRC-16 (XMODEM)",			polynomial: 0x1021, 	init: 0x0000, 		xorOut: 0x0000, 	width: 16 },

	"crc-24":        { name: "CRC-24 (OpenPGP)",		polynomial: 0x864cfb, 	init: 0xb704ce, 	xorOut: 0x000000, 	width: 24 },

	"crc-32":        { name: "CRC-32",					polynomial: 0xedb88320, init: 0xffffffff, 	xorOut: 0xffffffff, width: 32, reflected: true },
	"crc-32-bzip2":  { name: "CRC-32 (bzip2)",			polynomial: 0x04c11db7, init: 0xffffffff, 	xorOut: 0xffffffff, width: 32 },
	"crc-32c":       { name: "CRC-32C (Castagnoli)",	polynomial: 0x82f63b78, init: 0xffffffff, 	xorOut: 0xffffffff, width: 32, reflected: true },
	"crc-32d":       { name: "CRC-32D",					polynomial: 0xd419cc15, init: 0xffffffff, 	xorOut: 0xffffffff, width: 32, reflected: true },
	"crc-32-mpeg2":  { name: "CRC-32 (MPEG-2)",			polynomial: 0x04c11db7, init: 0xffffffff, 	xorOut: 0x00000000, width: 32 },
	"crc-32-posix":  { name: "CRC-32 (Posix)",			polynomial: 0x04c11db7, init: 0x00000000, 	xorOut: 0xffffffff, width: 32 },
	"crc-32q":       { name: "CRC-32Q",					polynomial: 0x814141AB, init: 0x00000000, 	xorOut: 0x00000000, width: 32 }
};


const CRC_VARIANT_VALUES = [
	"crc-16-arc",
	"crc-16-kermit",
	"crc-16-x25",
	"crc-16-xmodem",
	"crc-24",
	"crc-32",
	"crc-32-bzip2",
	"crc-32c",
	"crc-32d",
	"crc-32-mpeg2",
	"crc-32-posix",
	"crc-32q"
];
const CRC_VARIANT_NAMES = CRC_VARIANT_VALUES.map(id => CRC_VARIANTS[id].name);

const TABLE_CACHE = {};

class CrcTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Checksum")
			.addOption("variant", "Variant", "crc-32", { type: "select", texts: CRC_VARIANT_NAMES, values: CRC_VARIANT_VALUES });
	}

	makeCrcTable(polynomial, width)
	{
		// TODO: Endian DataView?
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
		// TODO: Endian DataView?
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

	getTable(variant)
	{
		let result = TABLE_CACHE[variant.name];
		if (!result)
		{
			result = TABLE_CACHE[variant.name] = variant.reflected ? 
				this.makeReflectedCrcTable(variant.polynomial) : 
				this.makeCrcTable(variant.polynomial, variant.width);
		}
		return result;
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);
		const variant = CRC_VARIANTS[options.variant];
		if (typeof variant === "undefined")
		{
			throw new TransformError(`Unknown CRC variant, ID ${options.variant}.`);
		}
		
		const crcTable = this.getTable(variant);
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

		const length = variant.width / 8;
		const result = new Uint8Array(length);
		for (let i = length - 1; i >= 0; i--)
		{
			result[i] = crc & 0xff;
			crc >>>= 8;
		}
		return result;
	}
}

export {
	CrcTransform
};