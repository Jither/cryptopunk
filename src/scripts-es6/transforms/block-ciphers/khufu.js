import { BlockCipherTransform } from "./block-cipher";
import { TransformError } from "../transforms";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { ror, rol } from "../../cryptopunk.bitarith";
import { getMerkleStandardSboxes, swapBytesInSbox } from "../shared/rand";

// TODO: Combine Khufu and Khafre(?)

const ROTATE_SCHEDULE = [16, 16, 8, 8, 16, 16, 24, 24];
const MAX_STANDARD_SBOX_COUNT = 8;
const INITIAL_SBOX_COUNT = 2;

const STANDARD_SBOXES = new Array();

function encryptKeyWords(keyWords, iv, auxKeys, sboxes)
{
	const khufu = new KhufuEncryptTransform(); // eslint-disable-line no-use-before-define
	const result = new Array(keyWords.length);
	for (let pos = 0; pos < keyWords.length; pos += 2)
	{
		const left = keyWords[pos] ^ iv[0];
		const right = keyWords[pos + 1] ^ iv[1];
		iv = khufu.transformWords(left, right, { auxKeys, sboxes }, 16);
		result[pos] = iv[0];
		result[pos + 1] = iv[1];
	}
	return result;
}

function keyMaterialFromWords(keyWords, sboxCount)
{
	// The initial S-boxes are simply clones of the first Standard S-box:
	const initialSboxes = new Array(INITIAL_SBOX_COUNT);
	for (let i = 0; i < INITIAL_SBOX_COUNT; i++)
	{
		initialSboxes[i] = STANDARD_SBOXES[0].concat();
	}

	// The last two words in the key are used for IV
	let iv = keyWords.slice(-2);
	const zeroAuxKeys = [0, 0, 0, 0];

	// Encrypt the 16 key words (512 bits) three times with Khufu in CBC mode, using:
	// - the IV (last 2 key words)
	// - the initial S-boxes
	// - the 0 auxiliary keys
	// Note that S-boxes and auxiliary keys stay the same for each iteration. Only the
	// plaintext input and the IV changes (by being replaced by the ciphertext output
	// and the last 2 words of the ciphertext output respectively).
	// The resulting ciphertext is used moving forward, for randomizing the S-boxes.
	for (let count = 0; count < 3; count++)
	{
		keyWords = encryptKeyWords(keyWords, iv, zeroAuxKeys, initialSboxes);
		iv = keyWords.slice(-2);
	}

	// Auxiliary keys are the first 4 encrypted words
	const auxKeys = new Array(4);
	auxKeys[0] = keyWords[0];
	auxKeys[1] = keyWords[1];
	auxKeys[2] = keyWords[2];
	auxKeys[3] = keyWords[3];

	// Initialize all S-boxes to be clones of the first initial S-box
	// TODO: Can we just reuse the initial S-boxes?
	const initialSbox = initialSboxes[0];
	const sboxes = new Array(sboxCount);
	for (let i = 0; i < sboxCount; i++)
	{
		sboxes[i] = initialSbox.concat();
	}

	// Count keeps track of how many bytes of the encrypted key material we've used.
	// Set to 16, because we used 4 words for the auxiliary keys:
	let count = 16;

	for (let sboxIndex = 0; sboxIndex < sboxCount; sboxIndex++)
	{
		for (let column = 0; column < 4; column++)
		{
			let mask = 0xff,
				smallerMask = (mask >>> 1);

			// Shuffle S-box by encrypted key material
			for (let row = 0; row < 255; row++)
			{
				let randomRow;
				// Repeat until we find a random row that is in range (>= row; <= 255)
				do
				{
					// We need a single byte (or less for smaller mask) from the key word, so we need
					// to mask and shift:
					// shift = how much the byte is shifted left from the least significant byte:
					// count 0 = 24
					// count 1 = 16
					// count 2 = 8
					// count 3 = 0
					const shift = (3 - (count & 3)) * 8;

					// mask << shift: Isolates the current byte (or less, if smaller mask is in use)
					// count >>> 2  : Really an integer divide by 4 (4 bytes per key word = use each key word 4 times)
					// >>> shift    : Shifts result right to be in least significant byte position
					// Note that we add the current row to the random result - that way we ensure that
					// the resulting random row is always >= row
					randomRow = row + (((mask << shift) & keyWords[count >>> 2]) >>> shift);
					count++;

					// If we run out of key material, generate 512 new random bits with another Khufu encryption:
					if (count > 63)
					{
						count = 0;
						keyWords = encryptKeyWords(keyWords, iv, zeroAuxKeys, initialSboxes);
						iv = keyWords.slice(-2);

						// Adjust mask to make random numbers more likely be in range
						while ((smallerMask | (255 - row)) === smallerMask)
						{
							mask = smallerMask;
							smallerMask >>>= 1;
						}
					}
				}
				while (randomRow > 255);

				swapBytesInSbox(sboxes[sboxIndex], row, randomRow, column);
			}
		}
	}

	return {
		sboxes,
		auxKeys
	};
}

function precomputeInitialStandardSbox()
{
	STANDARD_SBOXES[0] = getMerkleStandardSboxes(1)[0];
}

function precomputeStandardSboxes()
{
	// For the standard S-boxes, we use a key of all 0's:
	const keyWords = new Array(16);
	keyWords.fill(0);

	const keyMaterial = keyMaterialFromWords(keyWords, MAX_STANDARD_SBOX_COUNT);
	const standardSboxes = keyMaterial.sboxes;

	for (let i = 0; i < standardSboxes.length; i++)
	{
		STANDARD_SBOXES[i + 1] = standardSboxes[i];
	}
}

function precompute()
{
	if (STANDARD_SBOXES.length !== 0)
	{
		return;
	}
	// Generate standard S-boxes
	precomputeInitialStandardSbox();
	precomputeStandardSboxes();
}

class KhufuTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 16, { min: 8, max: 64, step: 8 });
	}

	transform(bytes, keyBytes)
	{
		const rounds = this.options.rounds;
		if (rounds < 8 || rounds > 64)
		{
			throw new TransformError(`Number of rounds must be between 8 and 64. Was: ${rounds}`);
		}
		if (rounds % 8 !== 0)
		{
			throw new TransformError("Number of rounds must be a multiple of 8.");
		}

		precompute();
		const keyMaterial = this.generateKeyMaterial(keyBytes, rounds);

		return this.transformBlocks(bytes, 64, keyMaterial, rounds);
	}

	generateKeyMaterial(keyBytes, rounds)
	{
		this.checkBytesSize("Key", keyBytes, 512);
		
		const sboxCount = rounds / 8;
		const keyWords = bytesToInt32sBE(keyBytes);
		return keyMaterialFromWords(keyWords, sboxCount);
	}

	transformBlock(block, dest, destOffset, keyMaterial, rounds)
	{
		const [left, right] = bytesToInt32sBE(block);

		const result = this.transformWords(left, right, keyMaterial, rounds);

		dest.set(int32sToBytesBE(result), destOffset);
	}
}

class KhufuEncryptTransform extends KhufuTransform
{
	constructor()
	{
		super(false);
	}

	transformWords(left, right, keyMaterial, rounds)
	{
		left ^= keyMaterial.auxKeys[0];
		right ^= keyMaterial.auxKeys[1];

		const octets = rounds / 8;
		for (let octet = 0; octet < octets; octet++)
		{
			const sbox = keyMaterial.sboxes[octet];
			for (let round = 0; round < 8; round++)
			{
				right ^= sbox[left & 0xff];
				left = ror(left, ROTATE_SCHEDULE[round]);

				[left, right] = [right, left];
			}
		}

		left ^= keyMaterial.auxKeys[2];
		right ^= keyMaterial.auxKeys[3];

		return [left, right];
	}
}

class KhufuDecryptTransform extends KhufuTransform
{
	constructor()
	{
		super(true);
	}

	transformWords(left, right, keyMaterial, rounds)
	{
		left ^= keyMaterial.auxKeys[2];
		right ^= keyMaterial.auxKeys[3];

		const octets = rounds / 8;
		for (let octet = octets - 1; octet >= 0; octet--)
		{
			const sbox = keyMaterial.sboxes[octet];
			for (let round = 7; round >= 0; round--)
			{
				[left, right] = [right, left];

				left = rol(left, ROTATE_SCHEDULE[round]);
				right ^= sbox[left & 0xff];
			}
		}

		left ^= keyMaterial.auxKeys[0];
		right ^= keyMaterial.auxKeys[1];

		return [left, right];
	}
}

class KhafreTransform extends KhufuTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	generateKeyMaterial(keyBytes, rounds)
	{
		this.checkBytesSize("Key", keyBytes, { min: 64 });
		
		const keyLength = keyBytes.length;

		if (keyLength % 8 !== 0)
		{
			throw new TransformError(`Key size must be a multiple of 64 bits (8 bytes).`);
		}
		if ((rounds / 8 + 1) % (keyLength / 8) !== 0)
		{
			throw new TransformError(`Key size incompatible with number of rounds.`);
		}

		const keyWords = bytesToInt32sBE(keyBytes);
		return { keys: keyWords, sboxes: STANDARD_SBOXES };
	}
}

class KhafreEncryptTransform extends KhafreTransform
{
	constructor()
	{
		super(false);
	}

	transformWords(left, right, keyMaterial, rounds)
	{
		const keys = keyMaterial.keys;
		const sboxes = keyMaterial.sboxes;
		const octets = rounds / 8;

		let keyIndex = 0;
		let octet = 0;
		for (;;)
		{
			if (keyIndex >= keys.length)
			{
				keyIndex = 0;
			}

			left  ^= ror(keys[keyIndex++], octet);
			right ^= ror(keys[keyIndex++], octet);

			if (octet >= octets)
			{
				break;
			}

			for (let round = 0; round < 8; round++)
			{
				right ^= sboxes[octet][left & 0xff];
				left = ror(left, ROTATE_SCHEDULE[round]);

				[left, right] = [right, left];
			}

			octet++;
		}
		return [left, right];
	}
}

class KhafreDecryptTransform extends KhafreTransform
{
	constructor()
	{
		super(true);
	}

	transformWords(left, right, keyMaterial, rounds)
	{
		const keys = keyMaterial.keys;
		const sboxes = keyMaterial.sboxes;
		const octets = rounds / 8;

		let keyIndex = keys.length - 2;
		let octet = octets;
		for (;;)
		{
			left  ^= ror(keys[keyIndex], octet);
			right ^= ror(keys[keyIndex + 1], octet);

			if (octet === 0)
			{
				break;
			}

			if (keyIndex === 0)
			{
				keyIndex = keys.length;
			}

			keyIndex -= 2;
			octet--;

			for (let round = 7; round >= 0; round--)
			{
				[left, right] = [right, left];

				left = rol(left, ROTATE_SCHEDULE[round]);
				right ^= sboxes[octet][left & 0xff];
			}
		}
		return [left, right];
	}
}

export {
	KhufuEncryptTransform,
	KhufuDecryptTransform,
	KhafreEncryptTransform,
	KhafreDecryptTransform,
};