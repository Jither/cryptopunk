import * as blowfish from "./transforms/modern/blowfish";
import * as des from "./transforms/modern/des";
import * as idea from "./transforms/modern/idea";
import * as lucifer from "./transforms/modern/lucifer";
import * as rc4 from "./transforms/modern/rc4";
import * as rijndael from "./transforms/modern/rijndael";
import * as skipjack from "./transforms/modern/skipjack";
import * as speck from "./transforms/modern/speck";
import * as threefish from "./transforms/modern/threefish";
import * as twofish from "./transforms/modern/twofish";

import * as haval from "./transforms/hashes/haval";
import * as md2 from "./transforms/hashes/md2";
import * as md4 from "./transforms/hashes/md4";
import * as md5 from "./transforms/hashes/md5";

const TRANSFORMS = {}

function addTransformsFrom(imp)
{
	for (let name in imp)
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

addTransformsFrom(blowfish);
addTransformsFrom(des);
addTransformsFrom(idea);
addTransformsFrom(lucifer);
addTransformsFrom(rc4);
addTransformsFrom(rijndael);
addTransformsFrom(skipjack);
addTransformsFrom(speck);
addTransformsFrom(threefish);
addTransformsFrom(twofish);

addTransformsFrom(haval);
addTransformsFrom(md2);
addTransformsFrom(md4);
addTransformsFrom(md5);

// For now, we use globals
global.TRANSFORMS = TRANSFORMS;
