import { BlockCipherTransform } from "./block-cipher";
import { TransformError } from "../transforms";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { ror, rol } from "../../cryptopunk.bitarith";

// TODO: Combine Khufu and Khafre(?)

const ROTATE_SCHEDULE = [16, 16, 8, 8, 16, 16, 24, 24];
const MAX_STANDARD_SBOX_COUNT = 8;
const INITIAL_SBOX_COUNT = 2;

// The first 606 5-digit numbers in "A Million Random Digits with 100,000 Normal Deviates" (1955)
// Converted to consecutive digits in a string for easy access.
// Why 606? Because Merkle has determined that is the exact amount needed to generate the initial S-Box
// using his algorithm (which discards some numbers).
const RAND = 
	"10097325337652013586346735487680959091173929274945375420480564894742962480524037" +
	"20636104020082291665084226895319645093032320902560159533476435080336069901902529" +
	"09376707153831131165886767439704436276591280799970801573614764032366539895116877" +
	"12171768336606574717340727685036697361706581339885111992917031060108054557182406" +
	"35303426148679907439234030973285269776020205165692686657481873053852471862388579" +
	"63573321350532547048905535754828468287098349125624737964575303529647783580834282" +
	"60935203443527388435985201776714905686072210940558609709343350500739981180505431" +
	"39808277325072568248294052420152775678518345299634062889808313746700781847540610" +
	"68711778178868540200865075840136766679519036476493296091106299594673488751764969" +
	"91826089289378561368234783411365481176741746850950580477697473039571864021816544" +
	"80124356351772708015453182237421115782531438553763743509981777402772144323600210" +
	"45521642379628602655699162680366252291483693687203766211399094400564180989320505" +
	"14225685144642756788962977882254382145989149914523684792768646162835549475089923" +
	"37089200488033694598269403685870297341355314033340420508234144104819498515747954" +
	"32979265755760040881222220641312550737421110002040128607469796644894392870725815" +
	"63606493291650534484402195256343651770820720731790611969044626457477745192433729" +
	"65394595934258260527154744526695270799535936783848823961011833211594669455728573" +
	"67897543875462244431911904259292927459734248116213973440872116868487670307112059" +
	"25701466702352378317732088983768935914162625229663055228256204493524947524633824" +
	"45862510256196279335653371247200549976546405188159961196389654692823912328729529" +
	"35963153072689809354333513546277974500249010339333598080839145427268428360949700" +
	"13021248927856520106460588523601390922867728144077939108364770617429413217900597" +
	"87379252410556707007867431715785394118386923461406201174520415956600001874392423" +
	"97118963381956541430017587537940419215856667436806849628520745155149381947607246" +
	"43667945435904790033208266954194864319943616810851348888155301540354560501451176" +
	"98086248264524028404449990889639094734073544131880331851623241941509498943548581" +
	"88695419943754873043809510040696382707742015123387250162529894624611717975249140" +
	"71961282966986102591748522053900387595791863332537981450657131010246740545561427" +
	"77938919367402943902775573227097790171195252758021808145174854178456118099337143" +
	"05335129695612719255360409032411664498835207984827593817153909973334408846123356" +
	"48324779283124964710022953687032307575461502009994690749413887637919763558404401" +
	"10518216150184876938091882009732825395270422086304833898737464278580449004585497" +
	"51981506549493881997918707615068476646597318950207476772626962290644642712467018" +
	"41361827607576876490209718774990429122729537505871938234317854016440566628131003" +
	"00682273982071453295077061781308358699107854242785136615887304618975533122308420" +
	"28306032648133310591405100789332604604759411901840538408623381594136285121590290" +
	"28466687957776220791917575374161613622695026390212557817651483483470558941592694" +
	"0039758391126071764648949723069454137408775130382086864299016841482774";

let STANDARD_SBOXES = new Array();

class RandProvider
{
	constructor()
	{
		this.position = 0;
	}
	inRange(low, high)
	{
		const range = (high - low) + 1;
		let rnd, max;
		do
		{
			rnd = 0;
			max = 1;
			while (max < range)
			{
				max *= 10;
				rnd = (rnd * 10) + this.digit();
			}
		}
		while (rnd >= Math.floor(max / range) * range);

		return low + (rnd % range);
	}

	digit()
	{
		return RAND.charCodeAt(this.position++) - 0x30;
	}
}

function swapBytesInSbox(sbox, row1, row2, column)
{
	let mask = 0xff000000;
	mask >>>= column * 8;
	const temp = sbox[row1];
	sbox[row1] = (sbox[row1] & (~mask)) | (sbox[row2] & mask);
	sbox[row2] = (sbox[row2] & (~mask)) | (temp & mask);
}

function encryptKeyWords(keyWords, iv, auxKeys, sboxes)
{
	const khufu = new KhufuEncryptTransform();
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
	const rand = new RandProvider();

	// The initial Standard S-box is simply sorted rows (00... 01... 02...) randomized using the RAND table
	const sbox = STANDARD_SBOXES[0] = new Array(256);

	for (let row = 0; row < 256; row++)
	{
		// Fill with trivial permutation: 00000000 01010101 02020202 ... ffffffff
		sbox[row] = 0x01010101 * row;
	}

	for (let column = 0; column < 4; column++)
	{
		// Knuth/Fisher-Yates shuffle (hence why we only iterate to 254)
		for (let row = 0; row < 255; row++)
		{
			swapBytesInSbox(sbox, row, rand.inRange(row, 255), column);
		}
	}
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
		this.checkKeySize(keyBytes, 512);
		
		const sboxCount = rounds / 8;
		const keyWords = bytesToInt32sBE(keyBytes);
		return keyMaterialFromWords(keyWords, sboxCount);
	}

	transformBlock(block, dest, destOffset, keyMaterial, rounds)
	{
		let [left, right] = bytesToInt32sBE(block);

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
		this.checkKeySize(keyBytes, { min: 64 });
		
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