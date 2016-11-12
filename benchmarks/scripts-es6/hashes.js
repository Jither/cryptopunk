import * as blake256 from "../../src/scripts-es6/transforms/hashes/blake256";
import * as blake512 from "../../src/scripts-es6/transforms/hashes/blake512";
import * as blake2s from "../../src/scripts-es6/transforms/hashes/blake2s";
import * as blake2b from "../../src/scripts-es6/transforms/hashes/blake2b";
import * as haval from "../../src/scripts-es6/transforms/hashes/haval";
import * as keccak from "../../src/scripts-es6/transforms/hashes/keccak";
import * as md2 from "../../src/scripts-es6/transforms/hashes/md2";
import * as md4 from "../../src/scripts-es6/transforms/hashes/md4";
import * as md5 from "../../src/scripts-es6/transforms/hashes/md5";
import * as ripemd from "../../src/scripts-es6/transforms/hashes/ripemd";
import * as ripemd160 from "../../src/scripts-es6/transforms/hashes/ripemd-160";
import * as ripemd128 from "../../src/scripts-es6/transforms/hashes/ripemd-128";
import * as sha1 from "../../src/scripts-es6/transforms/hashes/sha-1";
import * as sha256 from "../../src/scripts-es6/transforms/hashes/sha256";
import * as sha512 from "../../src/scripts-es6/transforms/hashes/sha512";
import * as tiger from "../../src/scripts-es6/transforms/hashes/tiger";
import * as whirlpool from "../../src/scripts-es6/transforms/hashes/whirlpool";
import * as sha3 from "../../src/scripts-es6/transforms/hashes/sha-3";
import * as utils from "../../src/scripts-es6/cryptopunk.utils";

window.cryptopunk = {
	hashes: {},
	utils: utils
};

function addTransformsFrom(imp)
{
	for (let name in imp)
	{
		if (!imp.hasOwnProperty(name))
		{
			continue;
		}
		const tfClass = imp[name];
		if (typeof tfClass !== "function")
		{
			continue;
		}

		window.cryptopunk.hashes[name] = tfClass;
	}
}

addTransformsFrom(blake256);
addTransformsFrom(blake512);
addTransformsFrom(blake2s);
addTransformsFrom(blake2b);
addTransformsFrom(haval);
addTransformsFrom(keccak);
addTransformsFrom(md2);
addTransformsFrom(md4);
addTransformsFrom(md5);
addTransformsFrom(ripemd);
addTransformsFrom(ripemd128);
addTransformsFrom(ripemd160);
addTransformsFrom(sha1);
addTransformsFrom(sha256);
addTransformsFrom(sha512);
addTransformsFrom(sha3);
addTransformsFrom(tiger);
addTransformsFrom(whirlpool);
