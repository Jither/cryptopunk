import * as blowfish from "./transforms/modern/blowfish";
import * as des from "./transforms/modern/des";
import * as idea from "./transforms/modern/idea";
import * as lucifer from "./transforms/modern/lucifer";
import * as rc4 from "./transforms/modern/rc4";
import * as rijndael from "./transforms/modern/rijndael";
import * as skipjack from "./transforms/modern/skipjack";
import * as speck from "./transforms/modern/speck";

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

// For now, we use globals
global.TRANSFORMS = TRANSFORMS;
