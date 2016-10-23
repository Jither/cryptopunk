/*
import { Transform } from "../transform";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add64, sub64, xor64, mul64 } from "../../cryptopunk.bitarith";

const VARIANT_NAMES = [
	"Tiger",
	"Tiger2"
];

const VARIANT_VALUES = [
	1,
	2
];


class TigerTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Hash")
			.addOption("variant", "Variant", 1, { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES });
	}

	padMessage(bytes, variant)
	{
		const paddingLength = 64 - bytes.length % 64;
		const result = new Uint8Array(bytes.length + paddingLength);
		result.set(bytes);
		result[bytes.length] = (variant === 2 ? 0x80 : 0x01);
		return result;
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		// TODO: Consider DataView
		const padded = bytesToInt32sLE(this.padMessage(bytes, options.variant));

		const aa = { hi: 0x01234567, lo: 0x89abcdef };
		const bb = { hi: 0xfedcba98, lo: 0x76543210 };
		const cc = { hi: 0xf096a5b4, lo: 0xc3b2e187 };

		const x = [];
		for (let chunkindex = 0; chunkindex < padded.length; chunkindex++)
		{
			for (let index = chunkindex; index < chunkindex + 16; index += 2)
			{
				x.push({ hi: padded[index], lo: padded[index + 1] });
			}

			const a = { hi: aa.hi, lo: aa.lo };
			const b = { hi: bb.hi, lo: bb.lo };
			const c = { hi: cc.hi, lo: cc.lo };

			for (let step = 0; step < 8; step++)
			{
				c = xor64(x[step]);
				a = sub64(a, xor64(T1[c.lo & 0xff], T2[(c.lo >>> 16) & 0xff], T3[c.hi & 0xff], T4[(c.hi >>> 16) & 0xff]));
				b = add64(b, xor64(T4[(c.lo >>> 8) & 0xff], T3[c.lo >>> 24], T2[(c.hi >>> 8) & 0xff], T1[c.hi >>> 24]));
				b = mul64(b, 5);
			}


		}
	}
}
*/