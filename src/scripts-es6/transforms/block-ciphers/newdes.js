import { BlockCipherTransform } from "./block-cipher";
import { hexToBytes, bytesToHex } from "../../cryptopunk.utils";

const ROUNDS = 8;

// The United States Declaration of Independence, on which the S-box is based:
const DECLARATION =
//In Congress, July 4, 1776.
//The unanimous Declaration of the thirteen united States of America,
`When in the Course of human events, it becomes necessary for one people to dissolve the political bands which have connected them with another, and to
assume among the powers of the earth, the separate and equal station to which the Laws of Nature and of Nature's God entitle them, a decent respect to the opinions of mankind requires that they
should declare the causes which impel them to the separation. ___ We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator
with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.--That to secure these rights, Governments are instituted among Men, deriving their just
powers from the consent of the governed, --That whenever any Form of Government becomes destructive of these ends, it is the Right of the People to alter or to abolish it, and to institute new
Government, laying its foundation on such principles and organizing its powers in such form, as to them shall seem most likely to effect their Safety and Happiness. Prudence, indeed, 
will dictate that Governments long established should not be changed for light and transient causes; and accordingly all experience hath shewn, that mankind are more disposed to suffer, while
evils are sufferable, than to right themselves by abolishing the forms to which they are accustomed. But when a long train of abuses and usurpations, pursuing invariably the same Object
evinces a design to reduce them under absolute Despotism, it is their right, it is their duty, to throw off such Government, and to provide new Guards for their future security.--Such has
been the patient sufferance of these Colonies; and such is now the necessity which constrains them to alter their former Systems of Government. The history of the present King of Great
Britain is a history of repeated injuries and usurpations, all having in direct object the establishment of an absolute Tyranny over these States. To prove this, let Facts be submitted to a candid
world. __ He has refused his Assent to Laws, the most wholesome and necessary for the public good. __ He has forbidden his Governors to pass Laws of immediate
and pressing importance, unless suspended in their operation till his Assent should be obtained; and when so suspended, he has utterly neglected to attend to them. __ He has refused to
pass other Laws for the accommodation of large districts of people, unless those people would relinquish the right of Representation in the Legislature, a right inestimable to them and formidable
to tyrants only. __ He has called together legislative bodies at places unusual, uncomfortable, and distant from the depository of their public Records, for the sole purpose of fatiguing them into
compliance with his measures. __ He has dissolved Representative Houses repeatedly, for opposing with manly firmness his invasions on the rights of the people. __ He has refused for
a long time, after such dissolutions, to cause others to be elected; whereby the Legislative powers, incapable of Annihilation, have returned to the People at large for their exercise; the State remain
ing in the mean time exposed to all the dangers of invasion from without, and convulsions within. __ He has endeavoured to prevent the population of these States; for that purpose obstruc
ting the Laws for Naturalization of Foreigners; refusing to pass others to encourage their migrations hither, and raising the conditions of new Appropriations of Lands. __ He has obstructed the
Administration of Justice, by refusing his Assent to Laws for establishing Judiciary powers. __ He has made Judges dependent on his Will alone, for the tenure of their offices, and the amount
and payment of their salaries. He has erected a multitude of New Offices, and sent hither swarms of Officers to harrass our people, and eat out their substance. __ He has kept among
us, in times of peace, Standing Armies without the Consent of our legislatures. __ He has affected to render the Military independent of and superior to the Civil power. He has combined
with others to subject us to a jurisdiction foreign to our constitution, and unacknowledged by our laws; giving his Assent to their Acts of pretended Legislation: __ For Quartering large bodies
of armed troops among us: For protecting them, by a mock Trial, from punishment for any Murders which they should commit on the Inhabitants of these States: __ For cutting off
our Trade with all parts of the world: __ For imposing Taxes on us without our Consent: __ For depriving us in many cases, of the benefits of Trial by Jury: __ For transporting us beyond
Seas to be tried for pretended offences __ For abolishing the free System of English Laws in a neighbouring Province, establishing therein an Arbitrary government, and enlarging its Boundaries
so as to render it at once an example and fit instrument for introducing the same absolute rule into these Colonies: __ For taking away our Charters, abolishing our most valuable Laws, and
altering fundamentally the Forms of our Governments: For suspending our own Legislatures, and declaring themselves invested with power to legislate for us in all cases whatsoever. __
He has abdicated Government here, by declaring us out of his Protection and waging War against us. __ He has plundered our seas, ravaged our Coasts, burnt our towns, and destroyed the lives
of our people. He is at this time transporting large Armies of foreign Mercenaries to compleat the works of death, desolation and tyranny, already begun with circumstances of Cruelty & perfidy
scarcely paralleled in the most barbarous ages, and totally unworthy the Head of a civilized nation. __ He has constrained our fellow Citizens taken Captive on the high Seas to bear Arms against
their Country, to become the executioners of their friends and Brethren, or to fall themselves by their Hands. __ He has excited domestic insurrections amongst us, and has endeavoured to bring on
the inhabitants of our frontiers, the merciless Indian Savages, whose known rule of warfare, is an undistinguished destruction of all ages, sexes and conditions.  In every stage of these Oppressions We
have Petitioned for Redress in the most humble terms: Our repeated Petitions have been answered only by repeated injury. A Prince whose character is thus marked by every act which may define a Tyrant,
is unfit to be the ruler of a free people. Nor have We been wanting in attentions to our Brittish brethren. We have warned them from time to time of attempts by their legislature to extend an unwarrant
able jurisdiction over us. We have reminded them of the circumstances of our emigration and settlement here. We have appealed to their native justice and magnanimity, and we have conjured them
by the ties of our common kindred to disavow these usurpations, which, would inevitably interrupt our connections and correspondence. They too have been deaf to the voice of justice and of
consanguinity. We must, therefore, acquiesce in the necessity, which denounces our Separation, and hold them, as we hold the rest of mankind, Enemies in War, in Peace Friends. ___
        We, therefore, the Representatives of the united States of America, in General Congress, Assembled, appealing to the Supreme Judge of the world for the rectitude of our in
tentions, do, in the Name, and by Authority of the good People of these Colonies, solemnly publish and declare, That these United Colonies are, and of Right ought to be Free and Independent
States; that they are Absolved from all Allegiance to the British Crown, and that all political connection between them and the State of Great Britain, is and ought to be totally dissolved; and
that as Free and Independent States, they have full Power to levy War, conclude Peace, contract Alliances, establish Commerce, and to do all other Acts and Things which Independent
States may of right do. And for the support of this Declaration, with a firm reliance on the protection of divine Providence, we mutually pledge to each other our Lives, our Fortunes
and our sacred Honor.`;

let S_BOX;

const VARIANT_NAMES = [
	"NewDES",
	"NewDES-96"
];

const VARIANT_VALUES = [
	"newdes",
	"newdes-96"
];

function precompute()
{
	if (S_BOX)
	{
		return;
	}

	// Create table with numbers 0..255
	S_BOX = new Uint8Array(256);
	for (let i = 0; i < 256; i++)
	{
		S_BOX[i] = i;
	}

	// Remove everything but letters, and convert to uppercase
	const filteredDeclaration = DECLARATION.toUpperCase().replace(/[^A-Z]/g, "");

	// Permute table based on ASCII value of each letter
	let i = 0, j = 0;
	for (let index = 0; index < filteredDeclaration.length; index++)
	{
		i = (i + 1) & 0xff;
		j = (j + filteredDeclaration.charCodeAt(index)) & 0xff;
		[S_BOX[i], S_BOX[j]] = [S_BOX[j], S_BOX[i]];
	}
}

class NewDesTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "newdes", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES });
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 120);

		precompute();
		const keys = this.generateSubKeys(keyBytes);
		return this.transformBlocks(bytes, 64, keys);
	}

	generateSubKeys(keyBytes)
	{
		const variant = this.options.variant;

		const keyLength = keyBytes.length;
		const subKeyCount = keyLength * 4;
		
		const result = new Uint8Array(subKeyCount);
		
		let i = 0;
		for (let round = 0; round < 4; round++)
		{
			for (let step = 0; step < keyLength; step++)
			{
				result[i] = keyBytes[i % keyLength];
				if (round > 0 && variant === "newdes-96")
				{
					result[i] ^= keyBytes[round + 6];
				}
				i++;
			}
		}
		return result;
	}
}

class NewDesEncryptTransform extends NewDesTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		let [b0, b1, b2, b3, b4, b5, b6, b7] = Uint8Array.from(block);

		let keyIndex = 0;
		for(let i = 0; i < ROUNDS; i++)
		{
			b4 ^= S_BOX[b0 ^ keys[keyIndex++]];
			b5 ^= S_BOX[b1 ^ keys[keyIndex++]];
			b6 ^= S_BOX[b2 ^ keys[keyIndex++]];
			b7 ^= S_BOX[b3 ^ keys[keyIndex++]];

			b1 ^= S_BOX[b4 ^ keys[keyIndex++]];
			b2 ^= S_BOX[b4 ^ b5];
			b3 ^= S_BOX[b6 ^ keys[keyIndex++]];
			b0 ^= S_BOX[b7 ^ keys[keyIndex++]];
		}

		b4 ^= S_BOX[b0 ^ keys[keyIndex++]];
		b5 ^= S_BOX[b1 ^ keys[keyIndex++]];
		b6 ^= S_BOX[b2 ^ keys[keyIndex++]];
		b7 ^= S_BOX[b3 ^ keys[keyIndex++]];

		dest.set([b0, b1, b2, b3, b4, b5, b6, b7], destOffset);
	}
}

class NewDesDecryptTransform extends NewDesTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		let [b0, b1, b2, b3, b4, b5, b6, b7] = Uint8Array.from(block);

		let keyIndex = keys.length - 1;
		for(let i = ROUNDS - 1; i >= 0; i--)
		{
			b7 ^= S_BOX[b3 ^ keys[keyIndex--]];
			b6 ^= S_BOX[b2 ^ keys[keyIndex--]];
			b5 ^= S_BOX[b1 ^ keys[keyIndex--]];
			b4 ^= S_BOX[b0 ^ keys[keyIndex--]];

			b0 ^= S_BOX[b7 ^ keys[keyIndex--]];
			b3 ^= S_BOX[b6 ^ keys[keyIndex--]];
			b2 ^= S_BOX[b4 ^ b5];
			b1 ^= S_BOX[b4 ^ keys[keyIndex--]];
		}

		b7 ^= S_BOX[b3 ^ keys[keyIndex--]];
		b6 ^= S_BOX[b2 ^ keys[keyIndex--]];
		b5 ^= S_BOX[b1 ^ keys[keyIndex--]];
		b4 ^= S_BOX[b0 ^ keys[keyIndex--]];

		dest.set([b0, b1, b2, b3, b4, b5, b6, b7], destOffset);
	}
}

export {
	NewDesEncryptTransform,
	NewDesDecryptTransform
};