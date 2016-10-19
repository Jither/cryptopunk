import { TransformError } from "../transforms";
import { NativeBaseTransform } from "./native-base";
import { intToByteArray } from "../../cryptopunk.utils";

const RSA_OAEP_HASHES = {
	"SHA-1": "SHA-1",
	"SHA-256": "SHA-256",
	"SHA-384": "SHA-384",
	"SHA-512": "SHA-512"
};

class NativeRsaOaepEncryptTransform extends NativeBaseTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Plaintext")
			.addInput("bytes", "Public modulo (n)")
			.addInput("bytes", "Label")
			.addOutput("bytes", "Ciphertext")
			.addOption("e", "Exponent (e)", 65537)
			.addOption("hash", "Underlying hash", "SHA-256", { type: "select", values: RSA_OAEP_HASHES });
	}

	transformAsync(bytes, keyBytes, labelBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		const plaintext = Uint8Array.from(bytes);
		const eBytes = intToByteArray(options.e);

		if (keyBytes.length === 0)
		{
			throw new TransformError("No key specified.");
		}

		const methodParams = {
			name: "RSA-OAEP",
		};

		if (labelBytes.length > 0)
		{
			methodParams.label = Uint8Array.from(labelBytes);
		}

		let keyAlgo;
		switch (options.hash)
		{
			case "SHA-1": keyAlgo = "RSA-OAEP"; break;
			case "SHA-256": keyAlgo = "RSA-OAEP-256"; break;
			case "SHA-384": keyAlgo = "RSA-OAEP-384"; break;
			case "SHA-512": keyAlgo = "RSA-OAEP-512"; break; // TODO: Throws unspecific error in Chrome
			default:
				throw new TransformError(`Unsupported underlying hash: ${options.hash}`);
		}

		const methodName = "encrypt";

		return window.crypto.subtle.importKey(
			"jwk",
			{
				kty: "RSA",
				e: this.arrayToJwkBase64(eBytes),
				n: this.arrayToJwkBase64(keyBytes),
				alg: keyAlgo,
				ext: true
			},
			{
				name: "RSA-OAEP",
				hash: { name: options.hash }
			},
			true, // Extractable - this isn't a security application, but a messing-about application
			[methodName]
		)
		.catch(error => { throw new TransformError(`Error during key import: ${error.message}`); })
		.then(publicKey => window.crypto.subtle[methodName](
			methodParams,
			publicKey,
			plaintext
		))
		.catch(error => 
		{ 
			const msg = error.message || "Unspecified error";
			throw new TransformError(`Error during ${methodName}ion. ${msg}`); 
		})
		.then(ciphertext => Array.from(new Uint8Array(ciphertext)));
	}
}

// Apparently for decryption in Chrome, Chrome needs d AND n AND p AND q AND dp AND dq AND qi
// making it really bothersome to build a decryption transform unless we calculate everything
// ourselves based on p and q. To be done...

class NativeRsaOaepDecryptTransform extends NativeBaseTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Ciphertext")
			.addInput("bytes", "Private modulo (d)")
			.addInput("bytes", "Public modulo (n)")
			.addInput("bytes", "Label")
			.addOutput("bytes", "Plaintext")
			.addOption("e", "Exponent (e)", 65537)
			.addOption("hash", "Underlying hash", "SHA-256", { type: "select", values: RSA_OAEP_HASHES });
	}

	transformAsync(bytes, privateKeyBytes, publicKeyBytes, labelBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		const ciphertext = Uint8Array.from(bytes);
		const eBytes = intToByteArray(options.e);

		if (privateKeyBytes.length === 0)
		{
			throw new TransformError("No private key specified.");
		}

		if (publicKeyBytes.length === 0)
		{
			throw new TransformError("No public key specified.");
		}

		const methodParams = {
			name: "RSA-OAEP",
		};

		if (labelBytes.length > 0)
		{
			methodParams.label = Uint8Array.from(labelBytes);
		}

		let keyAlgo;
		switch (options.hash)
		{
			case "SHA-1": keyAlgo = "RSA-OAEP"; break;
			case "SHA-256": keyAlgo = "RSA-OAEP-256"; break;
			case "SHA-384": keyAlgo = "RSA-OAEP-384"; break;
			case "SHA-512": keyAlgo = "RSA-OAEP-512"; break; // TODO: Throws unspecific error in Chrome
			default:
				throw new TransformError(`Unsupported underlying hash: ${options.hash}`);
		}

		return window.crypto.subtle.importKey(
			"jwk",
			{
				kty: "RSA",
				e: this.arrayToJwkBase64(eBytes),
				d: this.arrayToJwkBase64(privateKeyBytes),
				n: this.arrayToJwkBase64(publicKeyBytes),
				alg: keyAlgo,
				ext: true
			},
			{
				name: "RSA-OAEP",
				hash: { name: options.hash }
			},
			true, // Extractable - this isn't a security application, but a messing-about application
			["decrypt"]
		)
		.then(privateKey => window.crypto.subtle.encrypt(
			methodParams,
			privateKey,
			ciphertext
		))
		.then(plaintext => Array.from(new Uint8Array(plaintext)));
	}
}

export {
	NativeRsaOaepEncryptTransform,
	//NativeRsaOaepDecryptTransform
};