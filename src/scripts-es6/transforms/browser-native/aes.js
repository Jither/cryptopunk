import { TransformError } from "../transforms";
import { NativeBaseTransform } from "./native-base";

class NativeAesBaseTransform extends NativeBaseTransform
{
	constructor(encrypt)
	{
		super();
		this.encrypt = encrypt;

		this.addInput("bytes", encrypt ? "Plaintext" : "Ciphertext")
			.addInput("bytes", "Key") // Key
			.addOutput("bytes", encrypt ? "Ciphertext" : "Plaintext");
	}

	checkKey(keyBytes)
	{
		const keyLength = keyBytes.byteLength * 8;

		if (keyLength === 0)
		{
			throw new TransformError("No key specified");
		}

		if ([128, 192, 256].indexOf(keyLength) < 0)
		{
			throw new TransformError(`Key length must be one of 128, 192 or 256 bits. Was ${keyLength} bits`);
		}
	}

	constructIV(ivBytes, name)
	{
		const iv = ivBytes.length > 0 ? ivBytes : new Uint8Array(16);
		const ivLength = iv.byteLength * 8;
		if (ivLength !== 128)
		{
			throw new TransformError(`Length of ${name} must be 128 bits. Was ${ivLength} bits`);
		}
		return iv;
	}

	_transform(mode, messageBytes, keyBytes, ivBytes, ivName, additional, allowAnyIVLength)
	{
		this.checkKey(keyBytes);

		let iv;
		if (allowAnyIVLength)
		{
			iv = ivBytes;
		}
		else
		{
			iv = this.constructIV(ivBytes, ivName);
		}

		const methodName = this.encrypt ? "encrypt" : "decrypt";
		let methodParams = { name: mode };
		methodParams[ivName] = iv;

		methodParams = Object.assign({}, methodParams, additional);

		return this.importKey(keyBytes, mode, methodName)
			.catch(error => { throw new TransformError(`Error during key import: ${error.message}`); })
			.then(key => window.crypto.subtle[methodName](
				methodParams,
				key,
				messageBytes
			))
			.catch(error => 
			{ 
				const msg = error.message || `Message is likely not ${methodName}able in ${mode} mode.`;
				throw new TransformError(`Error during ${methodName}ion. ${msg}`); 
			});
			//.then(result => Array.from(new Uint8Array(result)));
	}
}

class NativeAesCtrEncryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(true);
		this.addInput("bytes", "Counter")
			.addOption("counterLength", "Counter length (bits)", 128);
	}

	transformAsync(bytes, keyBytes, counterBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		if (options.counterLength < 1 || options.counterLength > 128)
		{
			throw new TransformError(`Counter length must be > 1 and <= 128 bits. Was: ${options.counterLength}`);
		}

		return this._transform("AES-CTR", bytes, keyBytes, counterBytes, "counter", { length: options.counterLength });
	}
}

class NativeAesCtrDecryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(false);
		this.addInput("bytes", "Counter")
			.addOption("counterLength", "Counter length (bits)", 128);
	}

	transformAsync(bytes, keyBytes, counterBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		if (options.counterLength < 1 || options.counterLength > 128)
		{
			throw new TransformError(`Counter length must be > 1 and <= 128 bits. Was: ${options.counterLength}`);
		}

		return this._transform("AES-CTR", bytes, keyBytes, counterBytes, "counter", { length: options.counterLength });
	}
}

class NativeAesCbcEncryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(true);
		this.addInput("bytes", "IV");
	}

	transformAsync(bytes, keyBytes, ivBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		return this._transform("AES-CBC", bytes, keyBytes, ivBytes, "iv");
	}
}

class NativeAesCbcDecryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(false);
		this.addInput("bytes", "IV");
	}

	transformAsync(bytes, keyBytes, ivBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		return this._transform("AES-CBC", bytes, keyBytes, ivBytes, "iv");
	}
}

// NOTE: CFB is not actually supported in any browser (as of late 2016)
class NativeAesCfbEncryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(true);
		this.addInput("bytes", "IV");
	}

	transformAsync(bytes, keyBytes, ivBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		return this._transform("AES-CFB-8", bytes, keyBytes, ivBytes, "iv");
	}
}

class NativeAesCfbDecryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(false);
		this.addInput("bytes", "IV");
	}

	transformAsync(bytes, keyBytes, ivBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		return this._transform("AES-CFB-8", bytes, keyBytes, ivBytes, "iv");
	}
}

const GCM_TAG_LENGTHS = ["32", "64", "96", "104", "112", "120", "128" ];

class NativeAesGcmEncryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(true);
		this.addInput("bytes", "IV")
			.addInput("bytes", "Additional authentication data")
			.addOption("tagLength", "Tag length", 128, { type: "select", texts: GCM_TAG_LENGTHS });
	}

	transformAsync(bytes, keyBytes, ivBytes, authBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		const additional = {
			tagLength: parseInt(options.tagLength, 10)
		};

		if (authBytes.length > 0)
		{
			additional.additionalData = authBytes;
		}

		return this._transform("AES-GCM", bytes, keyBytes, ivBytes, "iv", additional, true);
	}
}

class NativeAesGcmDecryptTransform extends NativeAesBaseTransform
{
	constructor()
	{
		super(false);
		this.addInput("bytes", "IV")
			.addInput("bytes", "Additional authentication data")
			.addOption("tagLength", "Tag length", 128, { type: "select", texts: GCM_TAG_LENGTHS });
	}

	transformAsync(bytes, keyBytes, ivBytes, authBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		const additional = {
			tagLength: options.tagLength
		};

		if (authBytes.length > 0)
		{
			additional.additionalData = authBytes;
		}

		return this._transform("AES-GCM", bytes, keyBytes, ivBytes, "iv", additional, true);
	}
}

export {
	NativeAesCtrEncryptTransform,
	NativeAesCtrDecryptTransform,
	NativeAesCbcEncryptTransform,
	NativeAesCbcDecryptTransform,
	NativeAesCfbEncryptTransform,
	NativeAesCfbDecryptTransform,
	NativeAesGcmEncryptTransform,
	NativeAesGcmDecryptTransform
};