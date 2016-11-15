import { Transform } from "../transforms";
import { RipeMd160Transform, RipeMd320Transform } from "./ripemd-160";
import { RipeMd128Transform, RipeMd256Transform } from "./ripemd-128";

const VARIANT_NAMES = [
	"RIPEMD-128",
	"RIPEMD-160",
	"RIPEMD-256",
	"RIPEMD-320"
];

const VARIANT_TRANSFORMS = {
	"RIPEMD-128": RipeMd128Transform,
	"RIPEMD-160": RipeMd160Transform,
	"RIPEMD-256": RipeMd256Transform,
	"RIPEMD-320": RipeMd320Transform
};

class RipeMdNTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Message")
			.addOutput("bytes", "Hash")
			.addOption("variant", "Variant", "RIPEMD-160", { type: "select", texts: VARIANT_NAMES });
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

	transform(bytes)
	{
		const tf = this.getVariant(this.options.variant);
		return tf.transform(bytes);
	}
}

export {
	RipeMdNTransform
};