import test from "ava";
import { testAsciiHash } from "../_testutils";
import { HavalTransform } from "transforms/hashes/haval";

function doTest(title, expectedHex, input, length, passes)
{
	test("HAVAL hashes " + title, testAsciiHash, HavalTransform, expectedHex, input, { length: length, passes: passes });
}

doTest("cert vector #1", "c68f39913f901f3ddf44c707357a7d70", "", 128, 3);
doTest("cert vector #2", "4da08f514a7275dbc4cece4a347385983983a830", "a", 160, 3);
doTest("cert vector #3", "0c1396d7772689c46773f3daaca4efa982adbfb2f1467eea", "HAVAL", 192, 4);
doTest("cert vector #4", "bebd7816f09baeecf8903b1b9bc672d9fa428e462ba699f814841529", "0123456789", 224, 4);
doTest("cert vector #5", "c9c7d8afa159fd9e965cb83ff5ee6f58aeda352c0eff005548153a61551c38ee", "abcdefghijklmnopqrstuvwxyz", 256, 5);
doTest("cert vector #6", "b45cb6e62f2b1320e4f8f1b0b273d45add47c321fd23999dcf403ac37636d963", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 256, 5);
