import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Adler32Transform } from "transforms/checksums/adler-32";

function doTest(title, expectedHex, input)
{
	test(`Adler-32 calculates ${title} checksum`, testAsciiHash, Adler32Transform, expectedHex, input);
}

doTest("std test vector #0", "00000001", "");
doTest("std test vector #1", "00620062", "a");
doTest("std test vector #2", "024d0127", "abc");
doTest("std test vector #3", "29750586", "message digest");
doTest("std test vector #4", "90860b20", "abcdefghijklmnopqrstuvwxyz");
doTest("std test vector #5", "8adb150c", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest("std test vector #6", "97b61069", "1234567890".repeat(8));
