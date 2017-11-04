import { Transform, TransformError } from "../transforms";
import { checkSize } from "../../cryptopunk.utils";

class StreamCipherTransform extends Transform
{
	constructor()
	{
		super();
	}

	checkBytesSize(name, bytes, requiredSize)
	{
		const size = bytes.length * 8;
		const requirement = checkSize(size, requiredSize);
		if (requirement)
		{
			throw new TransformError(`${name} size must be ${requirement} bits. Was: ${size} bits.`);
		}
		return size;
	}
}

export {
	StreamCipherTransform
};
