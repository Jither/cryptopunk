import test from "ava";
import { TwofishEncryptTransform, TwofishDecryptTransform } from "transforms/modern/twofish";
import { testBytesToBytes } from "../_testutils";
import { hexToBytes, bytesToHex } from "cryptopunk.utils";

function doTest(title, expectedHex, messageHex, keyHex)
{
	const key = hexToBytes(keyHex);
	test("Twofish encrypts " + title, testBytesToBytes, TwofishEncryptTransform, expectedHex, messageHex, key);
	test("Twofish decrypts " + title, testBytesToBytes, TwofishDecryptTransform, messageHex, expectedHex, key);
}

doTest("ecb_ival.txt KEYSIZE=128", "9f589f5cf6122c32b6bfec2f2ae8c35a", "00000000000000000000000000000000", "00000000000000000000000000000000");
doTest("ecb_ival.txt KEYSIZE=192", "cfd1d2e5a9be9cdf501f13b892bd2248", "00000000000000000000000000000000", "0123456789abcdeffedcba98765432100011223344556677");
doTest("ecb_ival.txt KEYSIZE=256", "37527be0052334b89f0cfccae87cfa20", "00000000000000000000000000000000", "0123456789abcdeffedcba987654321000112233445566778899aabbccddeeff");

function exerciseEncrypt(keyLength)
{
	const tf = new TwofishEncryptTransform();

	let plaintext = hexToBytes("00000000000000000000000000000000");
	let key = hexToBytes("00".repeat(keyLength));

	let ciphertext;
	let prevPlaintext;

	for (let i = 1; i <= 49; i++)
	{
		ciphertext = tf.transform(plaintext, key);
		if (keyLength > 16)
		{
			if (i > 1)
			{
				// Next key = previous ciphertext...
				key.set(plaintext);
				// + first bytes from ciphertext 2 iterations back if needed
				key.set(prevPlaintext.subarray(0, keyLength - 16), 16);
			}
			prevPlaintext = plaintext;
		}
		else
		{
			// Next key = previous ciphertext
			key = plaintext;
		}
		// Next plaintext = current ciphertext
		plaintext = ciphertext;
	}

	return ciphertext;
}

test("Twofish does ecb_ival.txt exercise KEYSIZE=128", t => {

	t.deepEqual(exerciseEncrypt(16), hexToBytes("5d9d4eeffa9151575524f115815a12e0"));
});

test("Twofish does ecb_ival.txt exercise KEYSIZE=192", t => {

	t.deepEqual(exerciseEncrypt(24), hexToBytes("e75449212beef9f4a390bd860a640941"));
});

test("Twofish does ecb_ival.txt exercise KEYSIZE=256", t => {

	t.deepEqual(exerciseEncrypt(32), hexToBytes("37fe26ff1cf66175f5ddf4c33b97a205"));
});
