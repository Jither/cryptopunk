import test from "ava";
import { testAsciiHash } from "../_testutils";
import { WhirlpoolTransform } from "transforms/hashes/whirlpool";

function doTest(title, expectedHex, input)
{
	test("WHIRLPOOL hashes " + title, testAsciiHash, WhirlpoolTransform, expectedHex, input);
}

function doTest0(title, expectedHex, input)
{
	test("WHIRLPOOL-0 hashes " + title, testAsciiHash, WhirlpoolTransform, expectedHex, input, { variant: "whirlpool-0" });
}

function doTestT(title, expectedHex, input)
{
	test("WHIRLPOOL-T hashes " + title, testAsciiHash, WhirlpoolTransform, expectedHex, input, { variant: "whirlpool-t" });
}

doTest("ISO test vector #1", "19fa61d75522a4669b44e39c1d2e1726c530232130d407f89afee0964997f7a73e83be698b288febcf88e3e03c4f0757ea8964e59b63d93708b138cc42a66eb3", "");
doTest("ISO test vector #2", "8aca2602792aec6f11a67206531fb7d7f0dff59413145e6973c45001d0087b42d11bc645413aeff63a42391a39145a591a92200d560195e53b478584fdae231a", "a");
doTest("ISO test vector #3", "4e2448a4c6f486bb16b6562c73b4020bf3043e3a731bce721ae1b303d97e6d4c7181eebdb6c57e277d0e34957114cbd6c797fc9d95d8b582d225292076d4eef5", "abc");
doTest("ISO test vector #4", "378c84a4126e2dc6e56dcc7458377aac838d00032230f53ce1f5700c0ffb4d3b8421557659ef55c106b4b52ac5a4aaa692ed920052838f3362e86dbd37a8903e", "message digest");
doTest("ISO test vector #5", "f1d754662636ffe92c82ebb9212a484a8d38631ead4238f5442ee13b8054e41b08bf2a9251c30b6a0b8aae86177ab4a6f68f673e7207865d5d9819a3dba4eb3b", "abcdefghijklmnopqrstuvwxyz");
doTest("ISO test vector #6", "dc37e008cf9ee69bf11f00ed9aba26901dd7c28cdec066cc6af42e40f82f3a1e08eba26629129d8fb7cb57211b9281a65517cc879d7b962142c65f5a7af01467", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest("ISO test vector #7", "466ef18babb0154d25b9d38a6414f5c08784372bccb204d6549c4afadb6014294d5bd8df2a6c44e538cd047b2681a51a2c60481e88c5a20b2c2a80cf3a9a083b", "1234567890".repeat(8));
// Out-commented for resource intensiveness
//doTest("ISO test vector #8", "0c99005beb57eff50a7cf005560ddf5d29057fd86b20bfd62deca0f1ccea4af51fc15490eddc47af32bb2b66c34ff9ad8c6008ad677f77126953b226e4ed8b01", "a".repeat(1000000));
doTest("ISO test vector #9", "2a987ea40f917061f5d6f0a0e4644f488a7a5a52deee656207c562f988e95c6916bdc8031bc5be1b7b947639fe050b56939baaa0adff9ae6745b7b181c3be3fd", "abcdbcdecdefdefgefghfghighijhijk");

doTest0("NESSIE test vector #0", "b3e1ab6eaf640a34f784593f2074416accd3b8e62c620175fca0997b1ba2347339aa0d79e754c308209ea36811dfa40c1c32f1a2b9004725d987d3635165d3c8", "");
doTest0("NESSIE test vector #1", "f4b620445ae62431dbd6dbcec64d2a3031cd2f48df5e755f30b3d069929ed4b4eda0ae65441bc86746021fb7f2167f84d67566efaba003f0abb67a42a2ce5b13", "a");
doTest0("NESSIE test vector #2", "54ee18b0bbd4dd38a211699f2829793156e5842df502a2a25995c6c541f28cc050ff57d4af772dee7cedcc4c34c3b8ec06446c6657f2f36c2c06464399879b86", "abc");
doTest0("NESSIE test vector #3", "29e158ba336ce7f930115178a6c86019f0f413adb283d8f0798af06ca0a06d6d6f295a333b1c24bda2f429ac918a3748aef90f7a2c8bfb084d5f979cf4e7b2b5", "message digest");
doTest0("NESSIE test vector #4", "5ac9757e1407432daf348a972b8ad4a65c1123cf1f9b779c1ae7ee2d540f30b3cefa8f98dca5fbb42084c5c2f161a7b40eb6b4a1fc7f9aaab92a4bb6002edc5e", "abcdefghijklmnopqrstuvwxyz");
doTest0("NESSIE test vector #5", "d570eea0004210eaf957df144ab5241bdd4e2191789d4ba6a848cbcb0dad70439a603d3bb810560f8dfe4c6cf5e2b8968547bc729a9950c9da6ea02cae6881d7", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest0("NESSIE test vector #6", "cae4175f09753de84974cfa968621092fe41ee9de913919c2b452e6cb424056721d640e563f628f29dd3bd0030837ae4ac14aa17308505a92e5f7a92f112be75", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest0("NESSIE test vector #7", "e5965b4565b041a0d459610e5e48e944c4830cd16feba02d9d263e7da8de6a6b88966709bf28a5328d928312e7a172da4cff72fe6de02277dae4b1dba49689a2", "1234567890".repeat(8));
// Out-commented for resource intensiveness
//doTest0("NESSIE test vector #8", "bb6cba9730d6c029c0c15fb7a2aa3597cf9442dad96a676c5ee9a1d55f1d64d5e0d1ed0e71250ed960a1bd2e065642cfff1c976e061bab70d6c54d284eaaefb9", "a".repeat(1000000));

doTestT("NESSIE test vector #0", "470f0409abaa446e49667d4ebe12a14387cedbd10dd17b8243cad550a089dc0feea7aa40f6c2aaab71c6ebd076e43c7cfca0ad32567897dcb5969861049a0f5a", "");
doTestT("NESSIE test vector #1", "b290e0e7931025ed37043ad568f0036b40e6bff8f7455868780f47ef7b5d693e62448029a9351cd85ac29cb0725e4cfeb996a92f2b8da8768483ac58ec0e492c", "a");
doTestT("NESSIE test vector #2", "8afc0527dcc0a19623860ef2369d0e25de8ebe2abaa40f598afaf6b07c002ed73e4fc0fc220fd4f54f74b5d6b07aa57764c3dbdcc2cdd919d89fa8155a34b841", "abc");
doTestT("NESSIE test vector #3", "817eadf8efca5afbc11f71d0814e03a8d569c90f748c8603597a7a0de3c8d55f528199010218249517b58b14bee523515608754b53a3cca35c0865ba5e361431", "message digest");
doTestT("NESSIE test vector #4", "4afc2b07bddc8417635fcb43e695e16f45e116c226dd84339eb95c2ccb39e7acbe1af8f7b1f3bd380077e71929498bc968200371f9299015434d1df109a0aa1d", "abcdefghijklmnopqrstuvwxyz");
doTestT("NESSIE test vector #5", "d6111bc1e1301197c24b02f307e6dfd9349efed2716540ac1e2bd1a6d627f6d336643f3dbe8e80de772a2b890aa0088265b099fb4dc90b5fb3845995980e54f0", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTestT("NESSIE test vector #6", "0f960ec9ab7d0c7e355a423d1ef4911a39797c836a71414276afeb8fa475dba0c348547143162f3212edf1fb8d8c652a11a579a399c2dbd837fe8608f5096131", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTestT("NESSIE test vector #7", "6ae43784c69d01c273bba40f8411495167909e0c1acc241473d44e27bc8641e646535d38fce20604941988c387c201cff199c8fa2afbedd036d66202892a7eee", "1234567890".repeat(8));
// Out-commented for resource intensiveness
//doTestT("NESSIE test vector #8", "0ee18ba7ca7ee091dace6285661eedf819a8fa17620f72aeffe5aa62c462138b626aa09072a10fcbcfe7f7ff22db2f4d6d1f0771856c4a7924f9b0e4044d9112", "a".repeat(1000000));