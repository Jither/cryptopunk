import test from "ava";
import { SkipjackEncryptTransform, SkipjackDecryptTransform } from "transforms/modern/skipjack";
import { testBytesToBytes } from "../_testutils";
import { hexToBytes, bytesToHex } from "cryptopunk.utils";

function doTest(title, expectedHex, messageHex, keyHex)
{
	const key = hexToBytes(keyHex);
	test("Skipjack encrypts " + title, testBytesToBytes, SkipjackEncryptTransform, expectedHex, messageHex, key);
	test("Skipjack decrypts " + title, testBytesToBytes, SkipjackDecryptTransform, messageHex, expectedHex, key);
}

// That one test vector the NSA felt like providing
doTest("SKIPJACK and KEA Algorithm Specifications test vector", "2587cae27a12d300", "33221100ddccbbaa", "00998877665544332211");

// Either the NESSIE vectors are wrong, or everyone else is - these are vectors from a different implementation
// based on the spec.

doTest("Jason Papadopoulos vector #00", "c92d22324c6b31ae", "1ddf39abf5cd711e", "f8da02647722f7103adf");
doTest("Jason Papadopoulos vector #01", "e32877c1d9527fff", "dd6c6cce8f83e69e", "82760ac137948821eee4");
doTest("Jason Papadopoulos vector #02", "4745783f75b8861a", "beaacf177fa41a11", "843c1687d3cdca5fc5c3");
doTest("Jason Papadopoulos vector #03", "5c101636b8a57a72", "c4c09f216c1bc60a", "ae870cd7ff33a995f7e5");
doTest("Jason Papadopoulos vector #04", "b4fc0f8e54728f91", "d3f814b000245856", "5ccbd913ea8b73bd6391");
doTest("Jason Papadopoulos vector #05", "93b750608f5701f8", "356ec7d93832329c", "f65e74cd599c68a40cc7");
doTest("Jason Papadopoulos vector #06", "d823d45510099e61", "209ecf1c537ad56c", "aa106e46d7087c4e93dc");
doTest("Jason Papadopoulos vector #07", "0959e231b275d95f", "892eea9d64e17d66", "a93f9789a20c3cc34fea");
doTest("Jason Papadopoulos vector #08", "e7700209886767ae", "991390fd760fc91b", "88b163cbd61616888899");
doTest("Jason Papadopoulos vector #09", "e7cc49a56bd6a322", "daebc947ddca9c9e", "fb6cd1ff70487561df10");
doTest("Jason Papadopoulos vector #10", "e48a05cf26e242fd", "6419ddefe2cd8f2e", "5edc1ac0c4e7ef5f002c");
doTest("Jason Papadopoulos vector #11", "62c0e537b14df2c1", "322998ecbd068112", "8e3090c19aa32f94496a");
doTest("Jason Papadopoulos vector #12", "54d1e58a6b624d71", "3aae2aee20da93cc", "b96e3fd46fa4263f9092");
doTest("Jason Papadopoulos vector #13", "5d0f235a9d221ce0", "14311112ca11f727", "9e6635baee28c5bce2bc");
doTest("Jason Papadopoulos vector #14", "8e5b03522e68cbeb", "300e4313e7ad6796", "04127ce16dc1b1726a66");
doTest("Jason Papadopoulos vector #15", "572c9b4025a9134b", "09cd1c1accbe7797", "f0b89d75e979ccc9b172");
doTest("Jason Papadopoulos vector #16", "8c959c904789fbda", "31b30ca354af3cd8", "f9bfc78798cbf1bcd4b5");
doTest("Jason Papadopoulos vector #17", "b7d7f5fa342988fb", "08c59b0db99ec267", "f43a51b4273bde27d2b0");
doTest("Jason Papadopoulos vector #18", "763aa8ee109397b3", "9784b1e3e7e60e60", "cd51f0a75aa73c48edd2");
doTest("Jason Papadopoulos vector #19", "0325600337b8ad3c", "f65216373d4b43c7", "b3319a3f6622aa726bb3");
doTest("Jason Papadopoulos vector #20", "68e1c551c59108c0", "cba4c1215d5d36ce", "493254c9596e993f5f9c");
doTest("Jason Papadopoulos vector #21", "7eb6325d82a2096c", "82294851288e75cb", "76150c2c3ced1c7ca021");
doTest("Jason Papadopoulos vector #22", "2483f385a42ee3c6", "c3a7b7e4a52e407b", "7140d6c5486305872df6");
doTest("Jason Papadopoulos vector #23", "d6fa9db8685fd88a", "1bfde32ab559e13a", "3c2c3901f0ee9a3b2b0e");
doTest("Jason Papadopoulos vector #24", "0330489170b85293", "d205f7486c782838", "606a8b4bdfaae8a0ba51");
doTest("Jason Papadopoulos vector #25", "1f9b3301c9b2708c", "d96ff1f7c7fc60e0", "7847a47a0fe79ab770ce");
doTest("Jason Papadopoulos vector #26", "2b86c57ffe168895", "241d4bde19a75f8f", "73b9ab0c36c99e91a891");
doTest("Jason Papadopoulos vector #27", "5af7ceb3eed9dca1", "7be1b8d58321c619", "a37f2ad5a85e170741f5");
doTest("Jason Papadopoulos vector #28", "1b587736e116c04b", "c9214ea01ec14948", "f7b0c2a8170e3c4e48b3");
doTest("Jason Papadopoulos vector #29", "f3ecf0f1789a3923", "e2a3091feb581588", "a1fc67e44eacacf4a902");
doTest("Jason Papadopoulos vector #30", "e8d114c20ffa1c79", "3cb466d301b60854", "f14430affc5fe82a9ae9");
doTest("Jason Papadopoulos vector #31", "222903994d64fe3a", "b0684f8a5e63d935", "fd26df50486a4cd96d9b");
doTest("Jason Papadopoulos vector #32", "91f2baad6fa0de55", "ba1f37e88edec55f", "a6d46d46ca287e1a332a");
doTest("Jason Papadopoulos vector #33", "83f9f08f89a854ee", "e9fed8501b7a6579", "83c3f1cb8d06efc6196b");
doTest("Jason Papadopoulos vector #34", "2b1b6670a6be0324", "eb5ca8b3fa1fcdbb", "0edfa44c7d4a4ef0725e");
doTest("Jason Papadopoulos vector #35", "211a695da473766f", "b8b525c6382af277", "b8edcf167d99a711ccee");
doTest("Jason Papadopoulos vector #36", "eb2976370d22ef22", "9162e781ff683853", "4f639e0d5a5d2ad7e9a4");
doTest("Jason Papadopoulos vector #37", "dba4c0ef0ea098c0", "c9f23a20a39ded11", "37e006256a4ae6d320c4");
doTest("Jason Papadopoulos vector #38", "923daee8000709f9", "5a6f12f32f7eefdf", "e41d0bd25f931ba1d85c");
doTest("Jason Papadopoulos vector #39", "d5771e78b6f1fe1e", "cad5414c1c64f194", "fdf65bbc5fe600f3cd68");
doTest("Jason Papadopoulos vector #40", "634f7a3861af97a1", "063a58a20b45378f", "1c269af2ff166acb27ef");
doTest("Jason Papadopoulos vector #41", "3a803a4bd0e8c3e6", "08fbf42b4313347b", "1179f64acb6122ccf649");
doTest("Jason Papadopoulos vector #42", "f4fa372e7e1441a1", "6d4ed0e9930532d1", "078c87265eb8da323e90");
doTest("Jason Papadopoulos vector #43", "63a9197f7b75f53f", "40b699812345661d", "2fff35f8eb774c843bb0");
doTest("Jason Papadopoulos vector #44", "e91a050a7481b3dd", "22ed54626a51e505", "09f77346a4393ce99856");
doTest("Jason Papadopoulos vector #45", "6e9370a91b994878", "0c489b66e2da531b", "5b878e0b22a705acf8fb");
doTest("Jason Papadopoulos vector #46", "5bdecded96d656c9", "c64b10f8b191bc2c", "9d72c1ab2092c1b10877");
doTest("Jason Papadopoulos vector #47", "1a5680e51736026f", "91fdf7236f85bdd6", "72865f289725e1b55502");
doTest("Jason Papadopoulos vector #48", "0e7aace421bc79d8", "40009f8a465a9feb", "06e3c0e541f4aae6fe93");
doTest("Jason Papadopoulos vector #49", "a95d87fad12c3593", "543208b05bfa3858", "2ea09f1cc89e064f09bc");
