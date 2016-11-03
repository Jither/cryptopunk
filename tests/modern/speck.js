import test from "ava";
import { SpeckEncryptTransform, SpeckDecryptTransform } from "transforms/modern/speck";
import { testBytesToBytes } from "../_testutils";
import { hexToBytes, bytesToHex } from "cryptopunk.utils";

function doTest(title, expectedHex, messageHex, keyHex, blockSize)
{
	const key = hexToBytes(keyHex);
	test("Speck encrypts " + title, testBytesToBytes, SpeckEncryptTransform, expectedHex, messageHex, key, { blockSize: blockSize });
	test("Speck decrypts " + title, testBytesToBytes, SpeckDecryptTransform, messageHex, expectedHex, key, { blockSize: blockSize });
}

doTest("Speck 32/64"  , "a868 42f2", "6574 694c", "1918 1110 0908 0100", 32);

doTest("Speck 48/72"  , "c049a5 385adc", "20796c 6c6172", "121110 0a0908 020100", 48);
doTest("Speck 48/96"  , "735e10 b6445d", "6d2073 696874", "1a1918 121110 0a0908 020100", 48);

doTest("Speck 64/96"  , "9f7952ec 4175946c", "74614620 736e6165", "13121110 0b0a0908 03020100", 64);
doTest("Speck 64/128" , "8c6fa548 454e028b", "3b726574 7475432d", "1b1a1918 13121110 0b0a0908 03020100", 64);

doTest("Speck 96/96"  , "9e4d09ab7178 62bdde8f79aa", "65776f68202c 656761737520", "0d0c0b0a0908 050403020100", 96);
doTest("Speck 96/144" , "2bf31072228a 7ae440252ee6", "656d6974206e 69202c726576", "151413121110 0d0c0b0a0908 050403020100", 96);

doTest("Speck 128/128", "a65d985179783265 7860fedf5c570d18", "6c61766975716520 7469206564616d20", "0f0e0d0c0b0a0908 0706050403020100", 128);
doTest("Speck 128/192", "1be4cf3a13135566 f9bc185de03c1886", "7261482066656968 43206f7420746e65", "1716151413121110 0f0e0d0c0b0a0908 0706050403020100", 128);
doTest("Speck 128/256", "4109010405c0f53e 4eeeb48d9c188f43", "65736f6874206e49 202e72656e6f6f70", "1f1e1d1c1b1a1918 1716151413121110 0f0e0d0c0b0a0908 0706050403020100", 128);
