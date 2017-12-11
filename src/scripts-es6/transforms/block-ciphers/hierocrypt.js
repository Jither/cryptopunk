import { BlockCipherTransform } from "./block-cipher";

class HierocryptTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}
}

class HierocryptEncryptTransform extends HierocryptTransform
{
	constructor()
	{
		super(false);
	}
}

class HierocryptDecryptTransform extends HierocryptTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	HierocryptEncryptTransform,
	HierocryptDecryptTransform
};