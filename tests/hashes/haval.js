import test from "ava";
import { testAsciiHash } from "../_testutils";
import { HavalTransform } from "transforms/hashes/haval";

test("Hashes HAVAL cert vector #1", testAsciiHash, HavalTransform, "c68f39913f901f3ddf44c707357a7d70", "", { length: 128, passes: 3 });
test("Hashes HAVAL cert vector #2", testAsciiHash, HavalTransform, "4da08f514a7275dbc4cece4a347385983983a830", "a", { length: 160, passes: 3 });
test("Hashes HAVAL cert vector #3", testAsciiHash, HavalTransform, "0c1396d7772689c46773f3daaca4efa982adbfb2f1467eea", "HAVAL", { length: 192, passes: 4 });
test("Hashes HAVAL cert vector #4", testAsciiHash, HavalTransform, "bebd7816f09baeecf8903b1b9bc672d9fa428e462ba699f814841529", "0123456789", { length: 224, passes: 4 });
test("Hashes HAVAL cert vector #5", testAsciiHash, HavalTransform, "c9c7d8afa159fd9e965cb83ff5ee6f58aeda352c0eff005548153a61551c38ee", "abcdefghijklmnopqrstuvwxyz", { length: 256, passes: 5 });
test("Hashes HAVAL cert vector #6", testAsciiHash, HavalTransform, "b45cb6e62f2b1320e4f8f1b0b273d45add47c321fd23999dcf403ac37636d963", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", {length: 256, passes: 5 });
