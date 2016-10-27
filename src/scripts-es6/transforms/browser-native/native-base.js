import { Transform } from "../transforms";

class NativeBaseTransform extends Transform
{
	constructor()
	{
		super();
	}

	arrayToJwkBase64(buffer)
	{
		let binary = "";
		for (let i = 0; i < buffer.length; i++)
		{
			binary += String.fromCharCode(buffer[i]);
		}
		const result = window.btoa(binary)
			.replace(/\+/g, "-") // URL encode
			.replace(/\//g, "_")
			.replace(/=/g, ""); // Remove padding

		return result;
	}

	importKey(key, algo, usage)
	{
		return window.crypto.subtle.importKey(
			"raw",
			key,
			algo,
			true, // Extractable - this isn't a security application, but a messing-about application
			[usage]
		);
	}
}

export {
	NativeBaseTransform
};