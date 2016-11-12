import test from "ava";
import { RijndaelEncryptTransform, RijndaelDecryptTransform } from "transforms/block-ciphers/rijndael";
import { testBytesToBytes } from "../_testutils";
import { hexToBytes, bytesToHex } from "cryptopunk.utils";

// Iterative exercise from https://blogs.msdn.microsoft.com/si_team/2006/05/19/aes-test-vectors/
// Based on twofish vector construction

function exerciseEncrypt(k, b)
{
	const tf = new RijndaelEncryptTransform();

	const n = k + b;
	const S = new Uint8Array(n);

	for (let i = 0; i < 1000; i++)
	{
		const plaintext = S.subarray(0, b);
		const key = S.subarray(b);
		// We encrypt twice per iteration (this is meant to test reuse of round keys in other implementations)
		let ciphertext = tf.transform(plaintext, key);
		ciphertext = tf.transform(ciphertext, key);
		// Move old key to front and append ciphertext
		S.set(key);
		S.set(ciphertext, k);
	}

	return S.subarray(S.length - b);
}

function exerciseDecrypt(k, b, key, ciphertext)
{
	const tf = new RijndaelDecryptTransform();

	const keyBytes = hexToBytes(key);
	const ciphertextBytes = hexToBytes(ciphertext);
	const n = b + k;
	const S = new Uint8Array(n);
	S.set(keyBytes);
	S.set(ciphertextBytes, k);
	// We encrypted 1000 times, so we need to decrypt 999 to get back to our origin
	for (let i = 0; i < 999; i++)
	{
		const key = S.subarray(0, k);
		const ciphertext = S.subarray(k);
		// We decrypt twice per iteration (this is meant to test reuse of round keys in other implementations)
		let plaintext = tf.transform(ciphertext, key);
		plaintext = tf.transform(plaintext, key);
		// Move old key to end of buffer and prepend the new plaintext
		S.set(key, n - k);
		S.set(plaintext);
	}

	return S.subarray(0, b);
}

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