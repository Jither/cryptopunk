import { Transform } from "../transforms";

class BsdTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Checksum");
	}

	transform(bytes)
	{
		let checksum = 0;

		for (let index = 0; index < bytes.length; index++)
		{
			// ROR 1
			checksum = (checksum >>> 1) | (checksum & 1) << 15;
			checksum += bytes[index];
			checksum &= 0xffff;
		}

		const result = new Uint8Array(2);
		result[0] = (checksum >> 8) & 0xff;
		result[1] = checksum & 0xff;

		return result;
	}
}

export {
	BsdTransform
};