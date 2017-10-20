import { KeccakBaseTransform } from "./keccak";

const VARIANT_VALUES = [
	"K12",
	"M14"
];

const VARIANT_NAMES = [
	"Kangaroo Twelve",
	"Marsupilami Fourteen"
];

class KangarooTwelveTransform extends KeccakBaseTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Customization")
			.addOption("variant", "Variant", "K12", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES })
			.addOption("length", "Size", 32, { min: 0 });
	}

	transform(bytes, customizationBytes)
	{
		// TODO: Handle in optionsChanged instead (when implemented)
		const keccakOptions = { size: this.options.length * 8 };

		switch (this.options.variant)
		{
			case "K12":
				keccakOptions.rounds = 12;
				keccakOptions.capacity = 256;
				break;
			case "M14":
				keccakOptions.rounds = 14;
				keccakOptions.capacity = 512;
				break;
		}
		
		// Input string S = concatenation of:
		// - Message M
		// - Customization String C
		// - Right encoded length of C
		const encodedLength = this.rightEncode(customizationBytes.length);
		const input = new Uint8Array(bytes.length + customizationBytes.length + encodedLength.length);
		input.set(bytes);
		input.set(customizationBytes, bytes.length);
		input.set(encodedLength, bytes.length + customizationBytes.length);

		const inputChunks = [];
		for (let offset = 0; offset < input.length; offset += 8192)
		{
			inputChunks.push(input.subarray(offset, offset + 8192));
		}

		if (inputChunks.length === 1)
		{
			keccakOptions.delimitedSuffix = 0x07; // Delimited suffix (lsb) 11|1
			this.setOptions(keccakOptions);
			return super.transform(inputChunks[0]);
		}
		else
		{
			return this.transformChunks(inputChunks, keccakOptions);
		}
	}
	
	transformChunks(inputChunks, keccakOptions)
	{
		const encodedLength = this.rightEncode(inputChunks.length - 1);
		const combinedLength = 
			8192 + 8 +
			((inputChunks.length - 1) * keccakOptions.capacity / 8) +
			encodedLength.length +
			2;
		const combined = new Uint8Array(combinedLength);
		
		combined.set(inputChunks[0]);
		
		let offset = 8192;
		combined[offset] = 0x03;
		offset += 8;

		keccakOptions.delimitedSuffix = 0x0B; // Delimited suffix (lsb) 110|1
		keccakOptions.size = keccakOptions.capacity;

		this.setOptions(keccakOptions);
		for (let i = 1; i < inputChunks.length; i++)
		{
			const output = super.transform(inputChunks[i]);
			combined.set(output, offset);

			offset += output.length;
		}
		combined.set(encodedLength, offset);
		offset += encodedLength.length;
		combined[offset++] = 0xff;
		combined[offset++] = 0xff;

		keccakOptions.delimitedSuffix = 0x06; // Delimited suffix (lsb) 01|1
		keccakOptions.size = this.options.length * 8;
		
		this.setOptions(keccakOptions);
		return super.transform(combined);
	}

	rightEncode(length)
	{
		const S = [];
		while (length > 0)
		{
			S.unshift(length % 256);
			length >>>= 8;
		}
		S.push(S.length);
		return Uint8Array.from(S);
	}
}

export {
	KangarooTwelveTransform
};