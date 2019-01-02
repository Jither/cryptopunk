import { Transform, TransformError } from "../transforms";
import bigint from "../../jither.bigint";

class TextbookRSAEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bigint", "Plaintext")
			.addInput("bigint", "Public Key e")
			.addInput("bigint", "Public Key n")
			.addOutput("bigint", "Ciphertext");
	}

	transform(plaintext, e, n)
	{
		if (!e || e.isZero)
		{
			throw new TransformError("No Public Key e specified.");
		}
		if (!n || n.isZero)
		{
			throw new TransformError("No Public Key n specified.");
		}

		if (plaintext.geq(n))
		{
			throw new TransformError("Textbook RSA cannot encrypt plaintext larger than n.");
		}
		
		plaintext = plaintext || bigint(0);
		return plaintext.powMod(e, n);
	}
}

class TextbookRSADecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bigint", "Ciphertext")
			.addInput("bigint", "Private Key d")
			.addInput("bigint", "Public Key n")
			.addOutput("bigint", "Plaintext");
	}

	transform(ciphertext, d, n)
	{
		if (!d || d.isZero)
		{
			throw new TransformError("No Private Key d specified.");
		}
		if (!n || n.isZero)
		{
			throw new TransformError("No Public Key n specified.");
		}
		ciphertext = ciphertext || bigint(0);
		return ciphertext.powMod(d, n);
	}
}

export {
	TextbookRSAEncryptTransform,
	TextbookRSADecryptTransform
};