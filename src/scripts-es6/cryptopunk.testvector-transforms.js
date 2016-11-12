import * as enigma from "./transforms/mechanical/enigma";

import * as blowfish from "./transforms/block-ciphers/blowfish";
import * as des from "./transforms/block-ciphers/des";
import * as idea from "./transforms/block-ciphers/idea";
import * as lucifer from "./transforms/block-ciphers/lucifer";
import * as rijndael from "./transforms/block-ciphers/rijndael";
import * as serpent from "./transforms/block-ciphers/serpent";
import * as skipjack from "./transforms/block-ciphers/skipjack";
import * as speck from "./transforms/block-ciphers/speck";
import * as threefish from "./transforms/block-ciphers/threefish";
import * as twofish from "./transforms/block-ciphers/twofish";

import * as rc4 from "./transforms/stream-ciphers/rc4";

import * as blake256 from "./transforms/hashes/blake256";
import * as blake512 from "./transforms/hashes/blake512";
import * as blake2s from "./transforms/hashes/blake2s";
import * as blake2b from "./transforms/hashes/blake2b";
import * as haval from "./transforms/hashes/haval";
import * as md2 from "./transforms/hashes/md2";
import * as md4 from "./transforms/hashes/md4";
import * as md5 from "./transforms/hashes/md5";
import * as ripemd from "./transforms/hashes/ripemd";
import * as ripemd128 from "./transforms/hashes/ripemd-128";
import * as ripemd160 from "./transforms/hashes/ripemd-160";
import * as sha1 from "./transforms/hashes/sha-1";
import * as sha256 from "./transforms/hashes/sha256";
import * as sha512 from "./transforms/hashes/sha512";
import * as sha3 from "./transforms/hashes/sha-3";
import * as tiger from "./transforms/hashes/tiger";
import * as whirlpool from "./transforms/hashes/whirlpool";

import * as adler32 from "./transforms/checksums/adler-32";
import * as crc from "./transforms/checksums/crc";

const TRANSFORMS = {};

function addTransformsFrom(imp)
{
	for (const name in imp)
	{
		if (!imp.hasOwnProperty(name))
		{
			continue;
		}
		if (name.indexOf("Transform") !== (name.length - 9))
		{
			continue;
		}
		const tfClass = imp[name];
		if (typeof tfClass !== "function")
		{
			continue;
		}

		TRANSFORMS[name] = tfClass;
	}
}

addTransformsFrom(enigma);

addTransformsFrom(blowfish);
addTransformsFrom(des);
addTransformsFrom(idea);
addTransformsFrom(lucifer);
addTransformsFrom(rc4);
addTransformsFrom(rijndael);
addTransformsFrom(serpent);
addTransformsFrom(skipjack);
addTransformsFrom(speck);
addTransformsFrom(threefish);
addTransformsFrom(twofish);

addTransformsFrom(blake256);
addTransformsFrom(blake512);
addTransformsFrom(blake2s);
addTransformsFrom(blake2b);
addTransformsFrom(haval);
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

addTransformsFrom(adler32);
addTransformsFrom(crc);

// For now, we use globals
/* globals global */
global.TRANSFORMS = TRANSFORMS;
