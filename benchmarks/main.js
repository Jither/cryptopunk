(function(cryptopunk, Benchmark)
{
	"use strict";

	var eleResults = document.getElementById("results");

	function createCell(eleRow)
	{
		var ele = document.createElement("td");
		eleRow.appendChild(ele);
		return ele;
	}

	function updateCells(bench, eleHz, eleRme, eleSize)
	{
		eleHz.innerText = bench.hz.toFixed(bench.hz < 100 ? 2 : 0);
		eleRme.innerText = "\xb1" + bench.stats.rme.toFixed(2) + "%";
		eleSize.innerText = bench.stats.sample.length;
	}

	function runBench(tfName, name, arg1, arg2)
	{
		var tfClass = cryptopunk.hashes[tfName];
		var tf = new tfClass();
		var eleResult = document.createElement("tr");
		eleResults.appendChild(eleResult);
		var eleName = createCell(eleResult);
		var eleHz = createCell(eleResult);
		var eleRme = createCell(eleResult);
		var eleSize = createCell(eleResult);
		eleName.innerText = name || tfName;

		const message = cryptopunk.utils.asciiToBytes("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque rhoncus dolor sit amet ipsum sodales, ac tincidunt purus vulputate. Sed fermentum non quam ac mattis. Maecenas egestas, tellus feugiat tempus aliquam, ligula dui lobortis sapien, tempus auctor massa magna non ex. Donec ornare, dolor eu maximus mollis, ex augue consequat libero, vitae placerat purus elit nec nibh. Praesent aliquet id enim sed semper. Sed elit orci, tempor vel arcu interdum, blandit laoreet libero. Morbi placerat iaculis quam. Nam amet.");

		var bench = new Benchmark(name || tfName, function()
		{
			tf.transform(
				message,
				arg1,
				arg2
			);
		})
		.on("cycle", function() {
			updateCells(this, eleHz, eleRme, eleSize);
		})
		.on("complete", function() {
			updateCells(this, eleHz, eleRme, eleSize);
		})
		.run({ async: true });
	}

	function startClickListener()
	{
		const emptyKey = new Uint8Array();

		runBench("Blake224Transform", "BLAKE-224");
		runBench("Blake256Transform", "BLAKE-256");
		runBench("Blake384Transform", "BLAKE-384");
		runBench("Blake512Transform", "BLAKE-512");
		runBench("Blake2sTransform", "BLAKE2s", emptyKey);
		runBench("HavalTransform", "HAVAL-128 (3 pass)", { passes: 3, length: 128 });
		runBench("HavalTransform", "HAVAL-128 (4 pass)", { passes: 4, length: 128 });
		runBench("HavalTransform", "HAVAL-128 (5 pass)", { passes: 5, length: 128 });
		runBench("HavalTransform", "HAVAL-192 (3 pass)", { passes: 3, length: 192 });
		runBench("HavalTransform", "HAVAL-192 (4 pass)", { passes: 4, length: 192 });
		runBench("HavalTransform", "HAVAL-192 (5 pass)", { passes: 5, length: 192 });
		runBench("HavalTransform", "HAVAL-256 (3 pass)", { passes: 3, length: 256 });
		runBench("HavalTransform", "HAVAL-256 (4 pass)", { passes: 4, length: 256 });
		runBench("HavalTransform", "HAVAL-256 (5 pass)", { passes: 5, length: 256 });
		runBench("Md2Transform", "MD2");
		runBench("Md4Transform", "MD4");
		runBench("Md5Transform", "MD5");
		runBench("RipeMdTransform", "RIPEMD");
		runBench("RipeMd128Transform", "RIPEMD-128");
		runBench("RipeMd160Transform", "RIPEMD-160");
		runBench("RipeMd256Transform", "RIPEMD-256");
		runBench("RipeMd320Transform", "RIPEMD-320");
		runBench("Sha0Transform", "SHA-0");
		runBench("Sha1Transform", "SHA-1");
		runBench("Sha224Transform", "SHA-224");
		runBench("Sha256Transform", "SHA-256");
		runBench("Sha384Transform", "SHA-384");
		runBench("Sha512Transform", "SHA-512");
		runBench("Sha3Transform", "SHA3-224", { variant: "SHA3-224" });
		runBench("Sha3Transform", "SHA3-256", { variant: "SHA3-256" });
		runBench("Sha3Transform", "SHA3-384", { variant: "SHA3-384" });
		runBench("Sha3Transform", "SHA3-512", { variant: "SHA3-512" });
		runBench("ShakeTransform", "SHAKE-128", { variant: "SHAKE-128" });
		runBench("ShakeTransform", "SHAKE-256", { variant: "SHAKE-256" });
		runBench("WhirlpoolTransform", "WHIRLPOOL");
	}

	document.getElementById("start").addEventListener("click", startClickListener);

}(window.cryptopunk, window.Benchmark))