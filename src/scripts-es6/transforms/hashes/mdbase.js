import { Transform } from "../transforms";
import { int32sToBytesLE, int32sToBytesBE } from "../../cryptopunk.utils";

class MdBaseTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Output");
	}

	padMessage(bytes, wordsize)
	{
		const P1 = wordsize * 1.75; // 56 for 32-bit, 112 for 64-bit
		const P2 = wordsize * 2; // 64 for 32-bit, 128 for 64-bit
		// TODO: Work on dwords instead? (Like rest of transform)

		const length = bytes.length;
		// "The message is "padded" (extended) so that its length (in bits) is
		// congruent to 448/896, modulo 512/1024"
		let paddingLength = P1 - (length % P2);

		// "Padding is always performed, even if the length of the message is
		// already congruent to 448/896, modulo 512/1024."
		// That is, if the calculated padding length is <= 0, we need to add 512/1024 bits to it
		if (paddingLength <= 0)
		{
			paddingLength += P2;
		}

		// Reserve space for message, padding, and length extension (depends on word size)
		const result = new Uint8Array(bytes.length + paddingLength + wordsize / 4);
		result.set(bytes);

		// "Padding is performed as follows: a single "1" bit is appended to the
		// message, and then "0" bits are appended so that the length in bits of
		// the padded message becomes congruent to 448, modulo 512.
		// In all, at least one bit and at most 512 bits are appended."
		result[bytes.length] = 0x80; // "1" bit

		// NOTE: The maximum javascript array size is 2^32-1 bytes. That's also the
		// (very theoretical) maximum message length we would be able to handle.
		// That means the low word will store the low 29 bits of the byte length - shifted
		// left by 3 because MD/SHA actually stores *bit* length. And the high word will
		// just store the 3 bits shifted out. For 64 bit hashes, the rest of the appended
		// message length bits are way out of reach and will just be set to 0.
		const bitLengthLo = length << 3;
		const bitLengthHi = length >>> 29;

		let index = bytes.length + paddingLength;
		if (this.endianness === "LE")
		{
			const bitLength = wordsize === 32 ? [bitLengthLo, bitLengthHi] : [bitLengthLo, bitLengthHi, 0, 0];
			result.set(int32sToBytesLE(bitLength), index)
		}
		else
		{
			const bitLength = wordsize === 32 ? [bitLengthHi, bitLengthLo] : [0, 0, bitLengthHi, bitLengthLo];
			result.set(int32sToBytesBE(bitLength), index)
		}

		return result;
	}
}

export {
	MdBaseTransform
};