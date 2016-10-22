import test from "ava";
import { testAsciiHash, testBytesHash } from "../_testutils";
import { RipeMdTransform } from "transforms/hashes/ripemd";

function doTest(title, expectedHex, input)
{
	test("RIPEMD hashes " + title, testAsciiHash, RipeMdTransform, expectedHex, input);
}

function doTestBytes(title, expectedHex, input)
{
	test("RIPEMD hashes " + title, testBytesHash, RipeMdTransform, expectedHex, input);
}

doTest("test vector #1", "9f73aa9b372a9dacfb86a6108852e2d9", "");
doTest("test vector #2", "486f74f790bc95ef7963cd2382b4bbc9", "a");
doTest("test vector #3", "3f14bad4c2f9b0ea805e5485d3d6882d", "abc");
doTest("test vector #4", "5f5c7ebe1abbb3c7036482942d5f9d49", "message digest");
doTest("test vector #5", "ff6e1547494251a1cca6f005a6eaa2b4", "abcdefghijklmnopqrstuvwxyz");
doTest("test vector #7", "ff418a5aed3763d8f2ddf88a29e62486", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest("test vector #8", "dfd6b45f60fe79bbbde87c6bfc6580a5", "1234567890".repeat(8));
doTestBytes("collision #1a", "dd6478dd9a7d821caa018648e5e792e9", "8eaf9f5779f5ec09ba6a4a5711354178a410b4a29f6c2fad2c20560b1179754de7aade0bf291bc787d6dbc47b1d1bd9a15205da4ff047181a8584726a54e0661");
doTestBytes("collision #1b", "dd6478dd9a7d821caa018648e5e792e9", "8eaf9f5779f5ec09ba6a4a5711355178a410b4a29f6c2fad2c20560b1179754de7aade0bf291bc787d6dc0c7b1d1bd9a15205da4ff047181a8584726a54e06e1");
doTestBytes("collision #2a", "88cea096c773c29f04cd96984a41d139", "8eaf9f5779f5ec09ba6a4a5711354178a410b4a29f6c2fad2c20560b1179754de7aade0bf291bc787d6dbc47b1d1bd9a15205da4ff04a5a0a8588db1b6660ce7");
doTestBytes("collision #2b", "88cea096c773c29f04cd96984a41d139", "8eaf9f5779f5ec09ba6a4a5711355178a410b4a29f6c2fad2c20560b1179754de7aade0bf291bc787d6dc0c7b1d1bd9a15205da4ff04a5a0a8588db1b6660c67");