import * as ascii from "./transforms/char-encodings/ascii";
import * as unicode from "./transforms/char-encodings/unicode";

import * as baseN from "./transforms/base-n";
import * as binary from "./transforms/binary";
import * as hex from "./transforms/hex";

import * as adfgvx from "./transforms/classical/adfgvx";
import * as affine from "./transforms/classical/affine";
import * as bifid from "./transforms/classical/bifid";
import * as letterNumber from "./transforms/classical/letter-number";
import * as playfair from "./transforms/classical/playfair";
import * as railfence from "./transforms/classical/railfence";
import * as rotx from "./transforms/classical/rotx";
import * as skip from "./transforms/classical/skip";
import * as subst from "./transforms/classical/simple-substitution";
import * as vigenere from "./transforms/classical/vigenere";

import * as enigma from "./transforms/mechanical/enigma";

import * as blowfish from "./transforms/block-ciphers/blowfish";
import * as camellia from "./transforms/block-ciphers/camellia";
import * as cast128 from "./transforms/block-ciphers/cast-128";
import * as cast256 from "./transforms/block-ciphers/cast-256";
import * as des from "./transforms/block-ciphers/des";
import * as hill from "./transforms/classical/hill";
import * as ice from "./transforms/block-ciphers/ice";
import * as idea from "./transforms/block-ciphers/idea";
import * as iraqi from "./transforms/block-ciphers/iraqi";
import * as khufu from "./transforms/block-ciphers/khufu";
import * as kuznyechik from "./transforms/block-ciphers/kuznyechik";
import * as lucifer from "./transforms/block-ciphers/lucifer";
import * as magma from "./transforms/block-ciphers/magma";
import * as newdes from "./transforms/block-ciphers/newdes";
import * as noekeon from "./transforms/block-ciphers/noekeon";
import * as present from "./transforms/block-ciphers/present";
import * as rc2 from "./transforms/block-ciphers/rc2";
import * as rc5 from "./transforms/block-ciphers/rc5";
import * as rc6 from "./transforms/block-ciphers/rc6";
import * as redpike from "./transforms/block-ciphers/red-pike";
import * as rijndael from "./transforms/block-ciphers/rijndael";
import * as serpent from "./transforms/block-ciphers/serpent";
import * as shark from "./transforms/block-ciphers/shark";
import * as skipjack from "./transforms/block-ciphers/skipjack";
import * as speck from "./transforms/block-ciphers/speck";
import * as square from "./transforms/block-ciphers/square";
import * as tea from "./transforms/block-ciphers/tea";
import * as threefish from "./transforms/block-ciphers/threefish";
import * as threeway from "./transforms/block-ciphers/3-way";
import * as treyfer from "./transforms/block-ciphers/treyfer";
import * as twofish from "./transforms/block-ciphers/twofish";
import * as xtea from "./transforms/block-ciphers/xtea";
import * as xxtea from "./transforms/block-ciphers/xxtea";

import * as rc4 from "./transforms/stream-ciphers/rc4";
import * as xor from "./transforms/stream-ciphers/xor";

import * as blake256 from "./transforms/hashes/blake256";
import * as blake512 from "./transforms/hashes/blake512";
import * as blake2s from "./transforms/hashes/blake2s";
import * as blake2b from "./transforms/hashes/blake2b";
import * as haval from "./transforms/hashes/haval";
import * as has160 from "./transforms/hashes/has-160";
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
import * as bsd from "./transforms/checksums/bsd";
import * as crc from "./transforms/checksums/crc";
import * as fletcher from "./transforms/checksums/fletcher";

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

addTransformsFrom(ascii);
addTransformsFrom(unicode);

addTransformsFrom(baseN);
addTransformsFrom(binary);
addTransformsFrom(hex);

addTransformsFrom(adfgvx);
addTransformsFrom(affine);
addTransformsFrom(bifid);
addTransformsFrom(hill);
addTransformsFrom(letterNumber);
addTransformsFrom(playfair);
addTransformsFrom(railfence);
addTransformsFrom(rotx);
addTransformsFrom(skip);
addTransformsFrom(subst);
addTransformsFrom(vigenere);

addTransformsFrom(enigma);

addTransformsFrom(blowfish);
addTransformsFrom(camellia);
addTransformsFrom(cast128);
addTransformsFrom(cast256);
addTransformsFrom(des);
addTransformsFrom(ice);
addTransformsFrom(idea);
addTransformsFrom(iraqi);
addTransformsFrom(khufu);
addTransformsFrom(kuznyechik);
addTransformsFrom(lucifer);
addTransformsFrom(magma);
addTransformsFrom(newdes);
addTransformsFrom(noekeon);
addTransformsFrom(present);
addTransformsFrom(rc2);
addTransformsFrom(rc5);
addTransformsFrom(rc6);
addTransformsFrom(redpike);
addTransformsFrom(rijndael);
addTransformsFrom(serpent);
addTransformsFrom(shark);
addTransformsFrom(skipjack);
addTransformsFrom(speck);
addTransformsFrom(square);
addTransformsFrom(tea);
addTransformsFrom(threefish);
addTransformsFrom(threeway);
addTransformsFrom(treyfer);
addTransformsFrom(twofish);
addTransformsFrom(xtea);
addTransformsFrom(xxtea);

addTransformsFrom(rc4);
addTransformsFrom(xor);

addTransformsFrom(blake256);
addTransformsFrom(blake512);
addTransformsFrom(blake2s);
addTransformsFrom(blake2b);
addTransformsFrom(has160);
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
addTransformsFrom(bsd);
addTransformsFrom(crc);
addTransformsFrom(fletcher);

// For now, we use globals
/* globals global */
global.TRANSFORMS = TRANSFORMS;
