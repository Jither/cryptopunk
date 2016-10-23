import { Transform } from "../transforms";
import { int32sToBytesLE, int32sToBytesBE } from "../../cryptopunk.utils";

const CONSTANTS = {
	SQRT2_DIV4:  0x5a827999, // 2^^30 * SQRT(2)
	SQRT3_DIV4:  0x6ed9eba1, // 2^^30 * SQRT(3)
	SQRT5_DIV4:  0x8f1bbcdc, // 2^^30 * SQRT(5)
	SQRT7_DIV4:  0xa953fd4e, // 2^^30 * SQRT(7)
	SQRT10_DIV4: 0xca62c1d6, // 2^^30 * SQRT(10)

	CBRT2_DIV4:  0x50a28be6, // 2^^30 * CBRT(2)
	CBRT3_DIV4:  0x5c4dd124, // 2^^30 * CBRT(3)
	CBRT5_DIV4:  0x6d703ef3, // 2^^30 * CBRT(5)
	CBRT7_DIV4:  0x7a6d76e9, // 2^^30 * CBRT(7)

	INIT_1_67 :  0x67452301, // Little Endian 01234567
	INIT_2_EF :  0xefcdab89, // Little Endian 89abcdef
	INIT_3_98 :  0x98badcfe, // Little Endian fedcba98
	INIT_4_10 :  0x10325476, // Little Endian 76543210
	INIT_5_C3 :  0xc3d2e1f0, // cdef 3210 interleaved

	INIT_1_76 :  0x76543210, // Big Endian version of INIT_4
	INIT_2_FE :  0xfedcba98, // Big Endian version of INIT_3
	INIT_3_89 :  0x89abcdef, // Big Endian version of INIT_2
	INIT_4_01 :  0x01234567, // Big Endian version of INIT_1
	INIT_5_3C :  0x3c2d1e0f  // Nibbles switched version of INIT_5
};

class MdBaseTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Hash");
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

		const index = bytes.length + paddingLength;
		if (this.endianness === "LE")
		{
			const bitLength = wordsize === 32 ? [bitLengthLo, bitLengthHi] : [bitLengthLo, bitLengthHi, 0, 0];
			result.set(int32sToBytesLE(bitLength), index);
		}
		else
		{
			const bitLength = wordsize === 32 ? [bitLengthHi, bitLengthLo] : [0, 0, bitLengthHi, bitLengthLo];
			result.set(int32sToBytesBE(bitLength), index);
		}

		return result;
	}
}

export {
	MdBaseTransform,
	CONSTANTS
};