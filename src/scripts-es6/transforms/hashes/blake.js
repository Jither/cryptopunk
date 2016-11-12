import { Transform } from "../transforms";
import { Blake256Transform, Blake224Transform } from "./blake256";
import { Blake512Transform, Blake384Transform } from "./blake512";

const VARIANT_NAMES = [
	"BLAKE-224",
	"BLAKE-256",
	"BLAKE-384",
	"BLAKE-512"
];

const VARIANT_TRANSFORMS = {
	"BLAKE-224": Blake224Transform,
	"BLAKE-256": Blake256Transform,
	"BLAKE-384": Blake384Transform,
	"BLAKE-512": Blake512Transform
};

class BlakeTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Message")
			.addOutput("bytes", "Hash")
			.addOption("variant", "Variant", "BLAKE-256", { type: "select", texts: VARIANT_NAMES });
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

	transform(bytes, options)
	{
		const tf = this.getVariant(options.variant);
		return tf.transform(bytes);
	}
}

export {
	BlakeTransform
};