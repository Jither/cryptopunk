import test from "ava";
import { Sha0Transform, Sha1Transform } from "transforms/hashes/sha1";
import { hexToBytes, asciiToBytes } from "cryptopunk.utils";

function testAsciiSha0(t, expectedHex, input)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new Sha0Transform();
	t.deepEqual(tf.transform(bytesInput), expected);
}

function testAsciiSha1(t, expectedHex, input)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new Sha1Transform();
	t.deepEqual(tf.transform(bytesInput), expected);
}

test("SHA-0 hashes libmd test vector #1", testAsciiSha0, "f96cea198ad1dd5617ac084a3d92c6107708c0ef", "");
test("SHA-0 hashes libmd test vector #2", testAsciiSha0, "0164b8a914cd2a5e74c4f7ff082c4d97f1edf880", "abc");
test("SHA-0 hashes libmd test vector #3", testAsciiSha0, "c1b0f222d150ebb9aa36a40cafdc8bcbed830b14", "message digest");
test("SHA-0 hashes libmd test vector #4", testAsciiSha0, "b40ce07a430cfd3c033039b9fe9afec95dc1bdcd", "abcdefghijklmnopqrstuvwxyz");
test("SHA-0 hashes libmd test vector #5", testAsciiSha0, "79e966f7a3a990df33e40e3d7f8f18d2caebadfa", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("SHA-0 hashes libmd test vector #6", testAsciiSha0, "4aa29d14d171522ece47bee8957e35a41f3e9cff", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");

test("SHA-1 hashes NESSIE test vector #0", testAsciiSha1, "da39a3ee5e6b4b0d3255bfef95601890afd80709", "");
test("SHA-1 hashes NESSIE test vector #1", testAsciiSha1, "86f7e437faa5a7fce15d1ddcb9eaeaea377667b8", "a");
test("SHA-1 hashes NESSIE test vector #2", testAsciiSha1, "a9993e364706816aba3e25717850c26c9cd0d89d", "abc");
test("SHA-1 hashes NESSIE test vector #3", testAsciiSha1, "c12252ceda8be8994d5fa0290a47231c1d16aae3", "message digest");
test("SHA-1 hashes NESSIE test vector #4", testAsciiSha1, "32d10c7b8cf96570ca04ce37f2a19d84240d3a89", "abcdefghijklmnopqrstuvwxyz");
test("SHA-1 hashes NESSIE test vector #5", testAsciiSha1, "84983e441c3bd26ebaae4aa1f95129e5e54670f1", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
test("SHA-1 hashes NESSIE test vector #6", testAsciiSha1, "761c457bf73b14d27e9e9265c46f4b4dda11f940", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("SHA-1 hashes NESSIE test vector #7", testAsciiSha1, "50abf5706a150990a08b2c5ea40fa0e585554732", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//test("SHA-1 hashes NESSIE test vector #8", testAsciiSha1, "34aa973cd4c4daa4f61eeb2bdbad27316534016f", "a".repeat(1000000));
