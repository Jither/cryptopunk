import { MdBaseTransform, CONSTANTS } from "./mdbase";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

class Sha1Transform extends MdBaseTransform
{
	constructor()
	{
		super();
		this.endianness = "BE";
	}

	transform(bytes)
	{
		// TODO: Consider DataView
		const padded = bytesToInt32sBE(this.padMessage(bytes, 32));

		let a = CONSTANTS.INIT_1_67;
		let b = CONSTANTS.INIT_2_EF;
		let c = CONSTANTS.INIT_3_98;
		let d = CONSTANTS.INIT_4_10;
		let e = CONSTANTS.INIT_5_C3;

		for (let chunkindex = 0; chunkindex < padded.length; chunkindex += 16)
		{
			// Copy chunk to new array:
			const x = padded.slice(chunkindex, chunkindex + 16);
			// Extend from 16 to 80 (d)words
			for (let index = 16; index < 80; index++)
			{
				let extension = x[index - 3] ^ x[index - 8] ^ x[index - 14] ^ x[index - 16];
				if (!this.sha0)
				{
					// The one difference between the withdrawn "SHA-0" and SHA-1:
					extension = rol(extension, 1);
				}
				x[index] = extension;
			}

			const [aa, bb, cc, dd, ee] = [a, b, c, d, e];

			for (let index = 0; index < x.length; index++)
			{
				let k, f;
				if (index < 20)
				{
					f = (b & c) ^ (~b & d);
					k = CONSTANTS.SQRT2_DIV4;
				}
				else if (index < 40)
				{
					f = b ^ c ^ d;
					k = CONSTANTS.SQRT3_DIV4;
				}
				else if (index < 60)
				{
					f = (b & c) ^ (b & d) ^ (c & d);
					k = CONSTANTS.SQRT5_DIV4;
				}
				else if (index < 80)
				{
					f = b ^ c ^ d;
					k = CONSTANTS.SQRT10_DIV4;
				}

				const temp = add(rol(a, 5), f, e, k, x[index]);
				e = d;
				d = c;
				c = rol(b, 30);
				b = a;
				a = temp;
			}

			a = add(a, aa);
			b = add(b, bb);
			c = add(c, cc);
			d = add(d, dd);
			e = add(e, ee);
		}

		return int32sToBytesBE([a, b, c, d, e]);
	}
}

class Sha0Transform extends Sha1Transform
{
	constructor()
	{
		super();
		this.sha0 = true;
	}
}


export {
	Sha0Transform,
	Sha1Transform
};