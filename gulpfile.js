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
	styles: "./src/styles/"
}

gulp.task("lint-scripts", function() {
	return gulp.src([src.scripts + "**/*.js"])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task("build-scripts", ["lint-scripts"], function() {
	return compile(src.scripts + "cryptopunk.main.js", dest.scripts);
});

gulp.task("build-styles", function() {
	return gulp.src([src.styles + "**/main.scss"])
		.pipe(sass().on("error", sass.logError))
		.pipe(gulp.dest(dest.styles));
})

gulp.task("watch-scripts", ["lint-scripts"], function() {
	return compile(src.scripts + "cryptopunk.main.js", dest.scripts, true);
});

gulp.task("watch-styles", function() {
	gulp.watch([src.styles + "**/main.scss"], ["build-styles"]);
});

gulp.task("watch", ["watch-scripts", "watch-styles"]);

gulp.task("default", ["build-scripts", "watch"]);
