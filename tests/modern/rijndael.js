import test from "ava";
import { RijndaelEncryptTransform, RijndaelDecryptTransform } from "transforms/modern/rijndael";
import { hexToBytes, bytesToHex } from "cryptopunk.utils";

test("Encrypts FIPS-197 128-bit vector correctly", t => {
	const tf = new RijndaelEncryptTransform();

	const plaintext 	= hexToBytes("00112233445566778899aabbccddeeff");
	const key 			= hexToBytes("000102030405060708090a0b0c0d0e0f");
	const ciphertext 	= hexToBytes("69c4e0d86a7b0430d8cdb78070b4c55a");

	t.deepEqual(tf.transform(plaintext, key), ciphertext);
});

test("Encrypts FIPS-197 192-bit vector correctly", t => {
	const tf = new RijndaelEncryptTransform();

	const plaintext 	= hexToBytes("00112233445566778899aabbccddeeff");
	const key 			= hexToBytes("000102030405060708090a0b0c0d0e0f1011121314151617");
	const ciphertext 	= hexToBytes("dda97ca4864cdfe06eaf70a0ec0d7191");

	t.deepEqual(tf.transform(plaintext, key), ciphertext);
});

test("Encrypts FIPS-197 256-bit vector correctly", t => {
	const tf = new RijndaelEncryptTransform();

	const plaintext 	= hexToBytes("00112233445566778899aabbccddeeff");
	const key 			= hexToBytes("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
	const ciphertext 	= hexToBytes("8ea2b7ca516745bfeafc49904b496089");

	t.deepEqual(tf.transform(plaintext, key), ciphertext);
});

test("Decrypts FIPS-197 128-bit vector correctly", t => {
	const tf = new RijndaelDecryptTransform();

	const ciphertext 	= hexToBytes("69c4e0d86a7b0430d8cdb78070b4c55a");
	const key 			= hexToBytes("000102030405060708090a0b0c0d0e0f");
	const plaintext 	= hexToBytes("00112233445566778899aabbccddeeff");

	t.deepEqual(tf.transform(ciphertext, key), plaintext);
});

test("Decrypts FIPS-197 192-bit vector correctly", t => {
	const tf = new RijndaelDecryptTransform();

	const ciphertext 	= hexToBytes("dda97ca4864cdfe06eaf70a0ec0d7191");
	const key 			= hexToBytes("000102030405060708090a0b0c0d0e0f1011121314151617");
	const plaintext 	= hexToBytes("00112233445566778899aabbccddeeff");

	t.deepEqual(tf.transform(ciphertext, key), plaintext);
});

test("Decrypts FIPS-197 256-bit vector correctly", t => {
	const tf = new RijndaelDecryptTransform();

	const ciphertext 	= hexToBytes("8ea2b7ca516745bfeafc49904b496089");
	const key 			= hexToBytes("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
	const plaintext 	= hexToBytes("00112233445566778899aabbccddeeff");

	t.deepEqual(tf.transform(ciphertext, key), plaintext);
});

function exerciseEncrypt(k, b)
{
	const tf = new RijndaelEncryptTransform();

	const S = [];
	for (let i = 0; i < k + b; i++)
	{
		S.push(0);
	}
	for (let i = 0; i < 1000; i++)
	{
		const n = S.length;
		const key = S.slice(n - k);
		const plaintext = S.slice(n - k - b, n - k);
		// We encrypt twice per iteration (this is meant to test reuse of round keys in other implementations)
		let ciphertext = tf.transform(plaintext, key);
		ciphertext = tf.transform(ciphertext, key);
		// Remove everything we don't need anymore:
		S.splice(0, n-k);
		// And append the new ciphertext
		S.push(...ciphertext);
	}

	return S.slice(S.length - b);
}

function exerciseDecrypt(k, b, key, ciphertext)
{
	const tf = new RijndaelDecryptTransform();

	const S = hexToBytes(key).concat(hexToBytes(ciphertext));
	// We encrypted 1000 times, so we need to decrypt 999 to get back to our origin
	for (let i = 0; i < 999; i++)
	{
		const n = S.length;
		const ciphertext = S.slice(n - b);
		const key = S.slice(n - k - b, n - b);
		// We decrypt twice per iteration (this is meant to test reuse of round keys in other implementations)
		let plaintext = tf.transform(ciphertext, key);
		plaintext = tf.transform(plaintext, key);
		// Remove everything we don't need anymore:
		S.splice(n - b, b);
		// And prepend the new plaintext
		S.unshift(...plaintext);
	}

	return S.slice(0, b);
}

// Based on twofish vector construction
test("Exercise 128-bit Encrypt", t => {
	const expected = hexToBytes("bd883f01035e58f42f9d812f2dacbcd8");
	const actual = exerciseEncrypt(16, 16);
	t.deepEqual(actual, expected);
});

test("Exercise 192-bit Encrypt", t => {
	const expected = hexToBytes("41afb1004c073d92fdefa84a4a6b26ad");
	const actual = exerciseEncrypt(24, 16);
	t.deepEqual(actual, expected);
});

test("Exercise 256-bit Encrypt", t => {
	const expected = hexToBytes("c84b0f3a2c76dd9871900b07f09bdd3e");
	const actual = exerciseEncrypt(32, 16);
	t.deepEqual(actual, expected);
});

// These are just the reverse of the encryption exercises. We need to get back to 16 0-bytes
test("Exercise 128-bit Decrypt", t => {

	const key = "ae2324475917da16b41f6ed3f1e46861";
	const ciphertext = "bd883f01035e58f42f9d812f2dacbcd8";
	const expected = hexToBytes("00000000000000000000000000000000");
	const actual = exerciseDecrypt(16, 16, key, ciphertext);
	t.deepEqual(actual, expected);
});

test("Exercise 192-bit Decrypt", t => {

	const key = "621e105b3b92edd40e01c7119b9f3a5d2044fd7e66edb303";
	const ciphertext = "41afb1004c073d92fdefa84a4a6b26ad";
	const expected = hexToBytes("00000000000000000000000000000000");
	const actual = exerciseDecrypt(24, 16, key, ciphertext);
	t.deepEqual(actual, expected);
});

test("Exercise 256-bit Decrypt", t => {

	const key = "f405417529a3861dbef530c3e6912fa5ea8169c9c67a7322eacf5eefc012af9d";
	const ciphertext = "c84b0f3a2c76dd9871900b07f09bdd3e";
	const expected = hexToBytes("00000000000000000000000000000000");
	const actual = exerciseDecrypt(32, 16, key, ciphertext);
	t.deepEqual(actual, expected);
});