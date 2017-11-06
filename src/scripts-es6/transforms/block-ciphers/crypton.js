import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { ror, rol } from "../../cryptopunk.bitarith";

const VARIANT_VALUES = [
	"0.5",
	"1.0"
];

const VARIANT_NAMES = [
	"CRYPTON 0.5",
	"CRYPTON 1.0"
];

class CryptonTransform extends BlockCipherTransform
{
    constructor(decrypt)
    {
        super(decrypt);
        this.addOption("variant", "Variant", "1.0", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
    }

    transform(bytes, keyBytes)
    {
        this.checkBytesSize("Key", keyBytes, [128, 192, 256]);
        
    }
}