import test from "ava";
import { testAsciiHash, testBytesHash } from "../_testutils";
import { Blake224Transform, Blake256Transform } from "transforms/hashes/blake256";

function doTest224(title, expectedHex, inputHex)
{
	test("BLAKE-224 hashes " + title, testBytesHash, Blake224Transform, expectedHex, inputHex);
}

function doTest256(title, expectedHex, inputHex)
{
	test("BLAKE-256 hashes " + title, testBytesHash, Blake256Transform, expectedHex, inputHex);
}

doTest224("Paper test vector #1", "4504cb0314fb2a4f7a692e696e487912fe3f2468fe312c73a5278ec5", "00");
doTest224("Paper test vector #2", "f5aa00dd1cb847e3140372af7b5c46b4888d82c8c0a917913cfb5d04", "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000");

doTest256("Paper test vector #1", "0ce8d4ef4dd7cd8d62dfded9d4edb0a774ae6a41929a74da23109e8f11139c87", "00");
doTest256("Paper test vector #2", "d419bad32d504fb7d44d460c42c5593fe544fa4c135dec31e21bd9abdcc22d41", "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000");
