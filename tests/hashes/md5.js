import test from "ava";
import { Md5Transform } from "transforms/hashes/md5";
import { hexToBytes, asciiToBytes } from "cryptopunk.utils";

function testAsciiMd5(t, expectedHex, input)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new Md5Transform();
	t.deepEqual(tf.transform(bytesInput), expected);
}

test("Hashes RFC 1321 test vector #1", testAsciiMd5, "d41d8cd98f00b204e9800998ecf8427e", "");
test("Hashes RFC 1321 test vector #2", testAsciiMd5, "0cc175b9c0f1b6a831c399e269772661", "a");
test("Hashes RFC 1321 test vector #3", testAsciiMd5, "900150983cd24fb0d6963f7d28e17f72", "abc");
test("Hashes RFC 1321 test vector #4", testAsciiMd5, "f96b697d7cb7938d525a2f31aaf161d0", "message digest");
test("Hashes RFC 1321 test vector #5", testAsciiMd5, "c3fcd3d76192e4007dfb496cca67e13b", "abcdefghijklmnopqrstuvwxyz");
test("Hashes RFC 1321 test vector #6", testAsciiMd5, "d174ab98d277d9f5a5611c2c9f419d9f", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("Hashes RFC 1321 test vector #7", testAsciiMd5, "57edf4a22be3c955ac49da2e2107b67a", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");

test("Hashes exactly 448 bits correctly", testAsciiMd5, "8af270b2847610e742b0791b53648c09", "01234567890123456789012345678901234567890123456789012345");
test("Hashes exactly 512 bits correctly", testAsciiMd5, "7f7bfd348709deeaace19e3f535f8c54", "0123456789012345678901234567890123456789012345678901234567890123");
