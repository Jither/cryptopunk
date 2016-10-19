import test from "ava";
import { Md4Transform } from "transforms/hashes/md4";
import { hexToBytes, asciiToBytes } from "cryptopunk.utils";

function testAsciiMd4(t, expectedHex, input)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new Md4Transform();
	t.deepEqual(tf.transform(bytesInput), expected);
}

test("Hashes RFC 1320 test vector #1", testAsciiMd4, "31d6cfe0d16ae931b73c59d7e0c089c0", "");
test("Hashes RFC 1320 test vector #2", testAsciiMd4, "bde52cb31de33e46245e05fbdbd6fb24", "a");
test("Hashes RFC 1320 test vector #3", testAsciiMd4, "a448017aaf21d8525fc10ae87aa6729d", "abc");
test("Hashes RFC 1320 test vector #4", testAsciiMd4, "d9130a8164549fe818874806e1c7014b", "message digest");
test("Hashes RFC 1320 test vector #5", testAsciiMd4, "d79e1c308aa5bbcdeea8ed63df412da9", "abcdefghijklmnopqrstuvwxyz");
test("Hashes RFC 1320 test vector #6", testAsciiMd4, "043f8582f241db351ce627e153e7f0e4", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("Hashes RFC 1320 test vector #7", testAsciiMd4, "e33b4ddc9c38f2199c3e7b164fcc0536", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");

test("Hashes exactly 448 bits correctly", testAsciiMd4, "cce4257176f515fb56d35a4a5cbf8832", "01234567890123456789012345678901234567890123456789012345");
test("Hashes exactly 512 bits correctly", testAsciiMd4, "1d7851638dce5712dda85dec7cdaa0bc", "0123456789012345678901234567890123456789012345678901234567890123");
