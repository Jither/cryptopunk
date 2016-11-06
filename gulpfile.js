const gulp = require("gulp"),
	eslint = require("gulp-eslint"),
	sass = require("gulp-sass"),
	compile = require("./build/browser")
	;

const src =
{
	scripts: "./src/scripts-es6/",
	styles: "./src/styles/"
}

const dest =
{
	scripts: "./src/scripts/",
	vectors: "./vectors/",
	styles: "./src/styles/"
}

gulp.task("lint-scripts", function() {
	return gulp.src([src.scripts + "**/*.js"])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task("build-benchmark-libs", function()
{
	return gulp.src(["./node_modules/lodash/lodash.min.js", "./node_modules/benchmark/benchmark.js"])
		.pipe(gulp.dest("./benchmarks/libs/"));
});

gulp.task("build-benchmarks", ["build-benchmark-libs"], function() {
	return compile("./benchmarks/scripts-es6/hashes.js", "./benchmarks/scripts/", "hashes.js");
});

gulp.task("build-scripts", ["lint-scripts"], function() {
	return compile(src.scripts + "cryptopunk.main.js", dest.scripts, "cryptopunk.js");
});

gulp.task("build-transforms-for-test-vectors", function() {
	return compile(src.scripts + "cryptopunk.testvector-transforms.js", dest.vectors, "transforms.js");
});

gulp.task("build-styles", function() {
	return gulp.src([src.styles + "**/main.scss"])
		.pipe(sass().on("error", sass.logError))
		.pipe(gulp.dest(dest.styles));
})

gulp.task("watch-scripts", ["lint-scripts"], function() {
	return compile(src.scripts + "cryptopunk.main.js", dest.scripts, "cryptopunk.js", true);
});

gulp.task("watch-styles", function() {
	gulp.watch([src.styles + "**/main.scss"], ["build-styles"]);
});

gulp.task("watch", ["watch-scripts", "watch-styles"]);

gulp.task("default", ["build-scripts", "watch"]);
