import test from "ava";
import { Md2Transform } from "transforms/hashes/md2";
import { hexToBytes, asciiToBytes } from "cryptopunk.utils";

function testAsciiMd2(t, expectedHex, input)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new Md2Transform();
	t.deepEqual(tf.transform(bytesInput), expected);
}

test("Hashes RFC 1319 test vector #1", testAsciiMd2, "8350e5a3e24c153df2275c9f80692773", "");
test("Hashes RFC 1319 test vector #2", testAsciiMd2, "32ec01ec4a6dac72c0ab96fb34c0b5d1", "a");
test("Hashes RFC 1319 test vector #3", testAsciiMd2, "da853b0d3f88d99b30283a69e6ded6bb", "abc");
test("Hashes RFC 1319 test vector #4", testAsciiMd2, "ab4f496bfb2a530b219ff33031fe06b0", "message digest");
test("Hashes RFC 1319 test vector #5", testAsciiMd2, "4e8ddff3650292ab5a4108c3aa47940b", "abcdefghijklmnopqrstuvwxyz");
test("Hashes RFC 1319 test vector #6", testAsciiMd2, "da33def2a42df13975352846c30338cd", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("Hashes RFC 1319 test vector #7", testAsciiMd2, "d5976f79d83d3a0dc9806c3c66f3efd8", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");
