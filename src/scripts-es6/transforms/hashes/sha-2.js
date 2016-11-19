import { Transform } from "../transforms";
import { Sha256Transform, Sha224Transform } from "./sha256";
import { Sha512Transform, Sha384Transform, Sha512TruncatedTransform } from "./sha512";

const SHA2_VARIANT_NAMES = [
	"SHA-224",
	"SHA-256",
	"SHA-384",
	"SHA-512",
	"SHA-512/t"
];

const SHA2_VARIANT_TRANSFORMS = {
	"SHA-224": Sha224Transform,
	"SHA-256": Sha256Transform,
	"SHA-384": Sha384Transform,
	"SHA-512": Sha512Transform,
	"SHA-512/t": Sha512TruncatedTransform
};

class Sha2Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Message")
			.addOutput("bytes", "Hash")
			.addOption("variant", "Variant", "SHA-256", { type: "select", texts: SHA2_VARIANT_NAMES })
			// "t is any positive integer without a leading zero such that t < 512, and t is not 384."
			// We make the additional requirement that t % 8 = 0
			// TODO: Implement way of only showing this when SHA-512/t is selected
			.addOption("size", "Size (for SHA-512/t)", 256, { min: 8, max: 504, step: 8 });
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

	transform(bytes)
	{
		const tf = this.getVariant(this.options.variant);
		this.current.setOptions(this.options);
		return tf.transform(bytes);
	}
}

export {
	Sha2Transform
};