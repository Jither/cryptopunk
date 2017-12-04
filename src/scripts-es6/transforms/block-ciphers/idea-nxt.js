import { BlockCipherTransform } from "./block-cipher";

class IdeaNxtTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 16, { min: 12, max: 255 });
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, { min: 0, max: 256, step: 8 });
	}
}

class IdeaNxtEncryptTransform extends IdeaNxtTransform
{
	constructor()
	{
		super(false);
	}
}

class IdeaNxtDecryptTransform extends IdeaNxtTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	IdeaNxtEncryptTransform,
	IdeaNxtDecryptTransform
};