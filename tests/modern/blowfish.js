import test from "ava";
import { BlowfishEncryptTransform, BlowfishDecryptTransform } from "transforms/modern/blowfish";
import { testBytesToBytes } from "../_testutils";
import { hexToBytes, bytesToHex } from "cryptopunk.utils";

function doTest(title, expectedHex, messageHex, keyHex)
{
	const key = hexToBytes(keyHex);
	test("Encrypts " + title, testBytesToBytes, BlowfishEncryptTransform, expectedHex, messageHex, key);
	test("Decrypts " + title, testBytesToBytes, BlowfishDecryptTransform, messageHex, expectedHex, key);
}

doTest("Eric Young ECB test data #1" , "4ef997456198dd78", "0000000000000000", "0000000000000000");
doTest("Eric Young ECB test data #2" , "51866fd5b85ecb8a", "ffffffffffffffff", "ffffffffffffffff");
doTest("Eric Young ECB test data #3" , "7d856f9a613063f2", "1000000000000001", "3000000000000000");
doTest("Eric Young ECB test data #4" , "2466dd878b963c9d", "1111111111111111", "1111111111111111");
doTest("Eric Young ECB test data #5" , "61f9c3802281b096", "1111111111111111", "0123456789abcdef");
doTest("Eric Young ECB test data #6" , "7d0cc630afda1ec7", "0123456789abcdef", "1111111111111111");
doTest("Eric Young ECB test data #7" , "4ef997456198dd78", "0000000000000000", "0000000000000000");
doTest("Eric Young ECB test data #8" , "0aceab0fc6a0a28d", "0123456789abcdef", "fedcba9876543210");
doTest("Eric Young ECB test data #9" , "59c68245eb05282b", "01a1d6d039776742", "7ca110454a1a6e57");
doTest("Eric Young ECB test data #10", "b1b8cc0b250f09a0", "5cd54ca83def57da", "0131d9619dc1376e");
doTest("Eric Young ECB test data #11", "1730e5778bea1da4", "0248d43806f67172", "07a1133e4a0b2686");
doTest("Eric Young ECB test data #12", "a25e7856cf2651eb", "51454b582ddf440a", "3849674c2602319e");
doTest("Eric Young ECB test data #13", "353882b109ce8f1a", "42fd443059577fa2", "04b915ba43feb5b6");
doTest("Eric Young ECB test data #14", "48f4d0884c379918", "059b5e0851cf143a", "0113b970fd34f2ce");
doTest("Eric Young ECB test data #15", "432193b78951fc98", "0756d8e0774761d2", "0170f175468fb5e6");
doTest("Eric Young ECB test data #16", "13f04154d69d1ae5", "762514b829bf486a", "43297fad38e373fe");
doTest("Eric Young ECB test data #17", "2eedda93ffd39c79", "3bdd119049372802", "07a7137045da2a16");
doTest("Eric Young ECB test data #18", "d887e0393c2da6e3", "26955f6835af609a", "04689104c2fd3b2f");
doTest("Eric Young ECB test data #19", "5f99d04f5b163969", "164d5e404f275232", "37d06bb516cb7546");
doTest("Eric Young ECB test data #20", "4a057a3b24d3977b", "6b056e18759f5cca", "1f08260d1ac2465e");
doTest("Eric Young ECB test data #21", "452031c1e4fada8e", "004bd6ef09176062", "584023641aba6176");
doTest("Eric Young ECB test data #22", "7555ae39f59b87bd", "480d39006ee762f2", "025816164629b007");
doTest("Eric Young ECB test data #23", "53c55f9cb49fc019", "437540c8698f3cfa", "49793ebc79b3258f");
doTest("Eric Young ECB test data #24", "7a8e7bfa937e89a3", "072d43a077075292", "4fb05e1515ab73a7");
doTest("Eric Young ECB test data #25", "cf9c5d7a4986adb5", "02fe55778117f12a", "49e95d6d4ca229bf");
doTest("Eric Young ECB test data #26", "d1abb290658bc778", "1d9d5c5018f728c2", "018310dc409b26d6");
doTest("Eric Young ECB test data #27", "55cb3774d13ef201", "305532286d6f295a", "1c587f1c13924fef");
doTest("Eric Young ECB test data #28", "fa34ec4847b268b2", "0123456789abcdef", "0101010101010101");
doTest("Eric Young ECB test data #29", "a790795108ea3cae", "0123456789abcdef", "1f1f1f1f0e0e0e0e");
doTest("Eric Young ECB test data #30", "c39e072d9fac631d", "0123456789abcdef", "e0fee0fef1fef1fe");
doTest("Eric Young ECB test data #31", "014933e0cdaff6e4", "ffffffffffffffff", "0000000000000000");
doTest("Eric Young ECB test data #32", "f21e9a77b71c49bc", "0000000000000000", "ffffffffffffffff");
doTest("Eric Young ECB test data #33", "245946885754369a", "0000000000000000", "0123456789abcdef");
doTest("Eric Young ECB test data #34", "6b5c5a9c5d9e0a5a", "ffffffffffffffff", "fedcba9876543210");

// Test variable key length:
doTest("Eric Young set_key test #1" , "f9ad597c49db005e", "fedcba9876543210", "f0");
doTest("Eric Young set_key test #2" , "e91d21c1d961a6d6", "fedcba9876543210", "f0e1");
doTest("Eric Young set_key test #3" , "e9c2b70a1bc65cf3", "fedcba9876543210", "f0e1d2");
doTest("Eric Young set_key test #4" , "be1e639408640f05", "fedcba9876543210", "f0e1d2c3");
doTest("Eric Young set_key test #5" , "b39e44481bdb1e6e", "fedcba9876543210", "f0e1d2c3b4");
doTest("Eric Young set_key test #6" , "9457aa83b1928c0d", "fedcba9876543210", "f0e1d2c3b4a5");
doTest("Eric Young set_key test #7" , "8bb77032f960629d", "fedcba9876543210", "f0e1d2c3b4a596");
doTest("Eric Young set_key test #8" , "e87a244e2cc85e82", "fedcba9876543210", "f0e1d2c3b4a59687");
doTest("Eric Young set_key test #9" , "15750e7a4f4ec577", "fedcba9876543210", "f0e1d2c3b4a5968778");
doTest("Eric Young set_key test #10", "122ba70b3ab64ae0", "fedcba9876543210", "f0e1d2c3b4a596877869");
doTest("Eric Young set_key test #11", "3a833c9affc537f6", "fedcba9876543210", "f0e1d2c3b4a5968778695a");
doTest("Eric Young set_key test #12", "9409da87a90f6bf2", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b");
doTest("Eric Young set_key test #13", "884f80625060b8b4", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c");
doTest("Eric Young set_key test #14", "1f85031c19e11968", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d");
doTest("Eric Young set_key test #15", "79d9373a714ca34f", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e");
doTest("Eric Young set_key test #16", "93142887ee3be15c", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f");
doTest("Eric Young set_key test #17", "03429e838ce2d14b", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f00");
doTest("Eric Young set_key test #18", "a4299e27469ff67b", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f0011");
doTest("Eric Young set_key test #19", "afd5aed1c1bc96a8", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f001122");
doTest("Eric Young set_key test #20", "10851c0e3858da9f", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f00112233");
doTest("Eric Young set_key test #21", "e6f51ed79b9db21f", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f0011223344");
doTest("Eric Young set_key test #22", "64a6e14afd36b46f", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f001122334455");
doTest("Eric Young set_key test #23", "80c7d7d45a5479ad", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f00112233445566");
doTest("Eric Young set_key test #24", "05044b62fa52d080", "fedcba9876543210", "f0e1d2c3b4a5968778695a4b3c2d1e0f0011223344556677");