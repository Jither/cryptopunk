import { Transform } from "../transforms";

class Rc4Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addInput("bytes", "Key")
			.addOutput("bytes", "Output")
			.addOption("discard", "Discard key bytes", 0, { min: 0 });
	}

	generateSbox(keyBytes)
	{
		const keySizeBytes = keyBytes.length;

		const sbox = new Uint8Array(256);
		for (let i = 0; i < 256; i++)
		{
			sbox[i] = i;
		}
		let j = 0;
		for (let i = 0; i < 256; i++)
		{
			j = (j + sbox[i] + keyBytes[i % keySizeBytes]) & 0xff;
			const temp = sbox[i];
			sbox[i] = sbox[j];
			sbox[j] = temp;
		}

		return sbox;
	}

	discardKeyBytes(sbox, n)
	{
		let i = 0, j = 0;
		for (let index = 0; index < n; index++)
		{
			i = (i + 1) & 0xff;
			j = (j + sbox[i]) & 0xff;
			const temp = sbox[i];
			sbox[i] = sbox[j];
			sbox[j] = temp;
		}
		return [i, j];
	}

	transform(bytes, keyBytes)
	{
		const sbox = this.generateSbox(keyBytes);

		let [i, j] = this.discardKeyBytes(sbox, this.options.discard);

		const result = new Uint8Array(bytes.length);
		for (let index = 0; index < bytes.length; index++)
		{
			i = (i + 1) & 0xff;
			j = (j + sbox[i]) & 0xff;
			const temp = sbox[i];
			sbox[i] = sbox[j];
			sbox[j] = temp;

			const K = sbox[(sbox[i] + sbox[j]) & 0xff];

			result[index] = bytes[index] ^ K;
		}
		return result;
	}
}

export {
	Rc4Transform
};