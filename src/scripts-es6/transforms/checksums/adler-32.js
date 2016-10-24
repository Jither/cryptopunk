import { Transform, TransformError } from "../transforms";

const MOD_ADLER = 65521;

class Adler32Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Checksum");
	}

	transform(bytes)
	{
		let a = 1, b = 0;

		for (let index = 0; index < bytes.length; index++)
		{
			a = (a + bytes[index]) % MOD_ADLER;
			b = (b + a) % MOD_ADLER;
		}
		
		const result = new Uint8Array(4);
		result[0] = b >>> 8;
		result[1] = b & 0xff;
		result[2] = a >>> 8;
		result[3] = a & 0xff;

		return result;
	}
}

export {
	Adler32Transform
};