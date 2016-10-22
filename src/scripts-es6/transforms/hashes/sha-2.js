import { Transform } from "../transforms";
import { Sha256Transform, Sha224Transform } from "./sha256";
import { Sha512Transform, Sha384Transform } from "./sha512";

const SHA2_VARIANT_NAMES = [
	"SHA-224",
	"SHA-256",
	"SHA-384",
	"SHA-512"
];

const SHA2_VARIANT_TRANSFORMS = {
	"SHA-224": Sha224Transform,
	"SHA-256": Sha256Transform,
	"SHA-384": Sha384Transform,
	"SHA-512": Sha512Transform
};

class Sha2Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Hash")
			.addOption("variant", "Variant", "SHA-256", { type: "select", texts: SHA2_VARIANT_NAMES });
	}

	getVariant(variantId)
	{
		if (this.currentId === variantId)
		{
			return this.current;
		}
		this.currentId = variantId;
		const tfClass = SHA2_VARIANT_TRANSFORMS[variantId];
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
	Sha2Transform
};