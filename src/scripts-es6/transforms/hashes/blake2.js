import { Transform } from "../transforms";
import { Blake2sTransform } from "./blake2s";
import { Blake2bTransform } from "./blake2b";

const VARIANT_NAMES = [
	"BLAKE2s",
	"BLAKE2b"
];

const VARIANT_TRANSFORMS = {
	"BLAKE2s": Blake2sTransform,
	"BLAKE2b": Blake2bTransform
};

class Blake2Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Message")
			.addInput("bytes", "Key (optional)")
			.addOutput("bytes", "Hash")
			.addOption("variant", "Variant", "BLAKE2s", { type: "select", texts: VARIANT_NAMES })
			.addOption("size", "Size", 256, { min: 8, max: 512, step: 8 });
	}

	getVariant(variantId)
	{
		if (this.currentId === variantId)
		{
			return this.current;
		}
		this.currentId = variantId;
		const tfClass = VARIANT_TRANSFORMS[variantId];
		this.current = new tfClass();
		return this.current;
	}

	transform(bytes, key, options)
	{
		const tf = this.getVariant(options.variant);
		return tf.transform(bytes, key, options);
	}
}

export {
	Blake2Transform
};