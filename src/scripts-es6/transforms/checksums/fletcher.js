import { Transform, TransformError } from "../transforms";

const SIZES = [16, 32, 64];
const MOD_16 = 255;
const MOD_32 = 65535;
const MOD_64 = 4294967296;

// TODO: Fletcher-32 and Fletcher-64 make no sense - mixing endianness is the only way of getting expected (Wikipedia) results
// Note that most implementations are wrong in that they add bytes rather than (16/32-bit) words.

class FletcherTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Checksum")
			.addOption("size", "Size", 32, { type: "select", texts: SIZES });
	}

	transform(bytes)
	{
		const size = this.options.size;

		switch (size)
		{
			case 16:
				return this.transform16(bytes);
			case 32:
				return this.transform32(bytes);
			case 64:
				return this.transform64(bytes);
			default:
				throw new TransformError(`Size must be one of 16, 32 or 64`);
		}
	}

	transform16(bytes)
	{
		let a = 0, b = 0;

		for (let index = 0; index < bytes.length; index++)
		{
			a = (a + bytes[index]) % MOD_16;
			b = (b + a) % MOD_16;
		}

		const result = new Uint8Array(2);
		result[0] = b;
		result[1] = a;

		return result;
	}

	transform32(bytes)
	{
		let a = 0, b = 0;

		// Fletcher doesn't mention padding (the stream is meant to be a multiple of the block size always)
		// We use simple 0 padding
		for (let index = 0; index < bytes.length; index += 2)
		{
			// We read the byte stream as BE
			const block = ((bytes[index] << 8) | (bytes[index + 1 ] || 0));
			a = (a + block) % MOD_32;
			b = (b + a) % MOD_32;
		}

		// And return the result as LE words... WTF!?
		// (b at the "most significant end" is correct, but the order of bytes in b and a is reversed)
		const result = new Uint8Array(4);
		result[0] = b & 0xff;
		result[1] = b >> 8;
		result[2] = a & 0xff;
		result[3] = a >> 8;

		return result;
	}

	transform64(bytes)
	{
		let a = 0, b = 0;

		// Fletcher doesn't mention padding (the stream is meant to be a multiple of the block size always)
		// We use simple 0 padding
		for (let index = 0; index < bytes.length; index += 4)
		{
			const block = 	(bytes[index      ]       << 24) |
							((bytes[index + 1 ] || 0) << 16) |
							((bytes[index + 2 ] || 0) <<  8) |
							((bytes[index + 3 ] || 0));
			a = (a + block) % MOD_64;
			b = (b + a) % MOD_64;
		}

		const result = new Uint8Array(8);
		result[0] =  b         & 0xff;
		result[1] = (b >>   8) & 0xff;
		result[2] = (b >>  16) & 0xff;
		result[3] =  b >>> 24;
		result[4] =  a         & 0xff;
		result[5] = (a >>   8) & 0xff;
		result[6] = (a >>  16) & 0xff;
		result[7] =  a >>> 24;

		return result;
	}
}

export {
	FletcherTransform
};