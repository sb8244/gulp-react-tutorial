This repo accompanies my [blog post](http://blog.stephenbussey.com/rails-replacing-asset-pipeline-gulp/) on the same topic. It is a replacement for the asset pipeline using Gulp, explaining
all of the Gulpfile in detail.

# Commands Executed

```
bundle
rake db:migrate
npm install --global gulp
npm install
rails s
bower install # not needed because the files are included in the project now
gulp watch
# Browse localhost:3000
```

# What is the Asset Pipeline, and why replace it?

The [Asset Pipeline](http://guides.rubyonrails.org/asset_pipeline.html) is the solution that Rails provides to managing front-end code. It can do awesome things like compile Saas, Coffeescript, and concatonate / minify everything. It's turned on by default in Rails, and is a pretty low friction way to get started in Rails.

I wrote in a previous block bost about [integrating Angular into Rails](http://blog.stephenbussey.com/angular-rails-match-heaven/) through the Asset Pipeline. I really like the power of the Asset Pipeline in this way, but it's showing its age. It is nearly impossible to use new features like [ES6](https://github.com/TannerRogalsky/sprockets-es6), modules, npm, etc. If you want to use a very npm-centric ecosystem like the one around React, then that is going to require switching away from the Asset Pipeline. One potential way to do so is switching to Gulp.

# Gulp

[Gulp](http://gulpjs.com/) is a pretty slick stream based build system. You can think of your source files as streams, and you can apply transformations to them as they get built. The end result is a single file that is built however you told it to be built. It's a Node.js based system, and so requires npm to install. Give it a shot on their instructions https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md.

# Goals of the Switch

This could be the most controversial part of this post because everyone has different goals and ideas of what the end result should be. Here are my requirements for a new build system:

* Low friction once it's in place; transparent
* Easy to add new files / transformations into the build
* File locations are the same as in Rails (app/assets/)
* Access to NPM ecosystem ([Babel](https://github.com/babel/babelify), React, JSX)
* [Sourcemaps](https://www.npmjs.com/package/gulp-sourcemaps)
* No use of the asset pipeline, but could if I *really* needed to

# Let's Get Going!

I'm going to kick all of this off by making a new Rails project, and will do everything I need to do to get a React component rendered on my page. All of the code is available. In an attempt to be transparent, everything I need to type into console will also be in my repo!

Here is the repo https://github.com/sb8244/gulp-react-tutorial

## Getting Started

My first objective going into the repo is to disable the existing sprockets railtie in application.rb. This will ensure that I'm not falling back to sprockets in anyway.

NPM requires every project that uses it to define the dependencies in the `Package.json` file. I went ahead and [created one](https://github.com/sb8244/gulp-react-tutorial/commit/02d244dd6a9354c30b575ddf29453e7697e8c1c1) that has all of the goodies I know are required to get this Gulp build going successfully. These came from trial-and-error as well as different blog posts. With my package defined, running `npm install` will install the dependencies listed (sort of like `bundle install`).

## Housekeeping

For this tutorial, I took care of some basic housekeeping items. I created a React es6 component that will be rendered when you go to http://localhost:3000 as well as configuration for the Rails side. I don't want to gloss over it, but it's not super important. You can check out the accompanying repo to see what I did.

## Gulpfile.js

The Gulpfile is the heart of Gulp, and so we will break down my proposed sections. The goal going in is to have a Gulp pipeline to compile Sass, ES6, and pipe those out to /public/javascripts and /public/stylesheets.

```Gulpfile.js-1
var gulp = require('gulp');

var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');

var sass = require('gulp-sass');
var bower = require('gulp-bower');
var sourcemaps = require('gulp-sourcemaps');
var minifyCss = require('gulp-minify-css');
var util = require('gulp-util');

var bowerResolve = require('bower-resolve');
var source = require('vinyl-source-stream');

var config = {
  sassPath: './app/assets/stylesheets',
  bowerDir: './vendor/assets/components',
  requireFiles: ['./node_modules/react/react.js'],
  production: !!util.env.production
};
```

The above snippet is loading in all of our dependencies and defining some configuration we will require. If you wanted to add new transformations, you would first import the library here, then use the transformation later in the Gulpfile.

```
gulp.task('compile-scss', function() {
  return gulp.src(config.sassPath + '/application.scss')
    .on('error', function(E) {
      console.log(E);
    })
    .pipe(sourcemaps.init())
    .pipe(sass({
      errLogToConsole: true,
      indentedSyntax: false,
      includePaths: [
        config.bowerDir + '/bootstrap-sass/assets/stylesheets'
      ]
    }))
    .pipe(config.production ? minifyCss() : util.noop())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./public/stylesheets'));
});
```

Here's our first actual build definition, compiling sass. We start out of pipe chain by defining our source file (in this case app/assets/application.scss). This is very similar to Asset Pipeline where you have a single entry point, and it requires the things that it needs. We then define our error handler which will just log out the error (there are better tools for this).

Then the real fun begins, we are calling `sourcemaps.init()` as a pipe. This will do just what it says. For sourcemaps to work, you wrap a call to init/write around what you're doing. If the transformation is sourcemap compliant (it generates a file listing the transformations essentially), then it will generate correctly. It's a really nice feature that will tie your minified CSS/JS back to the correct line of your Sass or ES6.

Next, we pipe out to the sass process, which will compile our sass files into css. I choose to not use the indented syntax, so I set that to false. further, I pulled in bootstrap-sass from my bower directory. This is probably controversial, but I have found bower to be easier to work with for several things, and so I pulled it into my pipeline.

If we're in production, we are going to minify (this is done by saying `gulp --production`). I choose to not do it all of the time because it's the slowest part of the entire build.

We then finish off our sourcemaps and write the result to ./public/stylesheets/application.css which will also have the sourcemap at the bottom of it!

```Gulpfile.js-3
function browserifyShare(watch) {
  bowerResolve.init(function() {
    var entryFile = './app/assets/javascripts/application.js';
    var b = browserify(entryFile, {
      debug: true,
      cache: {},
      packageCache: {},
      fullPaths: true
    }).require(config.requireFiles)
      .transform(babelify)
      .plugin('minifyify', {output: 'public/javascripts/application.js.map', map: '/javascripts/application.js.map'})
      .require(bowerResolve('jquery'), {expose: 'jquery'});

    if (watch) {
      b = watchify(b);
      b.on('update', function() {
        bundleShare(b);
      });
    }

    bundleShare(b);
  });
}

function bundleShare(b) {
  return b.bundle()
    .on('error', function(E) { console.log(E); })
    .pipe(source('application.js'))
    .pipe(gulp.dest('public/javascripts'));
}
```

This is by far the most complex piece of this file. Let's break it down even smaller.

`bowerResolve.init(function() {` is what we use to initialize bower common-js bindings. This is a really cool helper that will provide things like jQuery as an import statement for our front-end code!

```
    var entryFile = config.jsPath + '/application.js';
    var b = browserify(entryFile, {
      debug: !config.production,
      cache: {},
      packageCache: {},
      fullPaths: true
    })
```

We are initializing our [browserify](http://browserify.org/) bundle. This is so that we can require npm modules that might be SS-only on our front-end. It's a pretty complex library, but this call will initialize the browserify library and return a stream that we can work with.

```
    .require(config.requireFiles)
      .transform(babelify)
      .plugin('minifyify', {output: 'public/javascripts/application.js.map', map: '/javascripts/application.js.map'})
      .require(bowerResolve('jquery'), {expose: 'jquery'});
```

`config.requireFiles` has our react library in it. This is where we put npm source files that we want to put on the front-end. `babelify` is our primary core transformation. It will do es6/jsx transformations for us, and is generally pretty awesome for how easy it is to put in here! The `plugin` call is how minify is used (a bit weird I know). This allows us to output a sourcemap for our javascript. It's not as simple as sourcemaps init/write sadly; when I tried to use that with other minification libraries, it really blew up. Finally, we exose `jquery` module like I mentioned earlier. This is actually a bower managed file, that is pulled in via bower resolve.

```
    if (watch) {
      b = watchify(b);
      b.on('update', function() {
        bundleShare(b);
      });
    }

    bundleShare(b);
```

We don't always want to watch JS (only when we say `gulp watch`), so we have to conditionally use the watchify transformation. When there is an update, we will bundle share again.

```
function bundleShare(b) {
  return b.bundle()
    .on('error', function(E) { console.log(E); })
    .pipe(source('application.js'))
    .pipe(gulp.dest('public/javascripts'));
}
```

This is the final transformation we will apply to our JS bundle. It takes application.js and writes it to our destination.

```
gulp.task('default', ['compile-scss', 'js']);

gulp.task('watch', ['watch-scss', 'watch-js']);

gulp.task('watch-scss', function() {
  gulp.watch('app/assets/stylesheets/**/*.scss', ['compile-scss']);
});

gulp.task('js', function() {
  browserifyShare(false);
});

gulp.task('watch-js', function() {
  browserifyShare(true);
});
```

We finally expose our gulp tasks. The ones that I typically use are default and watch since they pull in the others. We are able to call gulp.watch on the Sass (whereas we used watchify on the js) because the Sass should be fully recompiled on change but javascript can be done more strategically which the watchify transformation handles.

## Running Gulp

We can now run any of our gulp tasks. I run `gulp` for 1-time compile and `gulp watch` when I'm about to start coding and want to not run gulp manually. When it is time to productionize it, run `gulp --production` to fully minify everything and not use debug flags.

## Pull it all together

If you pull down [my repo](https://github.com/sb8244/gulp-react-tutorial), and execute the commands discussed, you will see a big "I'm Working!" rendered from an es6 React component.
