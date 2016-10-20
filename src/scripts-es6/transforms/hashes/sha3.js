import { KeccakBaseTransform } from "./keccak";

const SHA3_INSTANCES = {
	"SHA3-224": "SHA3-224",
	"SHA3-256": "SHA3-256",
	"SHA3-384": "SHA3-384",
	"SHA3-512": "SHA3-512"
};

const SHAKE_INSTANCES = {
	"SHAKE-128": "SHAKE-128",
	"SHAKE-256": "SHAKE-256"
};

class Sha3Transform extends KeccakBaseTransform
{
	constructor()
	{
		super();
		this.addOption("instance", "Instance", "SHA3-256", { type: "select", values: SHA3_INSTANCES });
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);
		const keccakOptions = { suffix: 0x06 };

		switch (options.instance)
		{
			case "SHA3-224":
				keccakOptions.capacity = 448;
				keccakOptions.length = 224;
				break;
			case "SHA3-256":
				keccakOptions.capacity = 512;
				keccakOptions.length = 256;
				break;
			case "SHA3-384":
				keccakOptions.capacity = 768;
				keccakOptions.length = 384;
				break;
			case "SHA3-512":
				keccakOptions.capacity = 1024;
				keccakOptions.length = 512;
				break;
		}
		return super.transform(bytes, keccakOptions);
	}
}

class ShakeTransform extends KeccakBaseTransform
{
	constructor()
	{
		super();
		this.addOption("instance", "Instance", "SHAKE-128", { type: "select", values: SHAKE_INSTANCES })
			.addOption("length", "Length", 128, { min: 0, step: 8 });
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);
		const keccakOptions = { suffix: 0x1f, length: options.length };

		switch (options.instance)
		{
			case "SHAKE-128":
				keccakOptions.capacity = 256;
				break;
			case "SHAKE-256":
				keccakOptions.capacity = 512;
				break;
		}
		return super.transform(bytes, keccakOptions);
	}
}

export {
	Sha3Transform,
	ShakeTransform
};