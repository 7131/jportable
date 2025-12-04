# Juggling Simulator Portable Images

English site: https://7131.github.io/jportable/<br>
Japanese site: https://app.7131.jp/jportable/

If a siteswap pattern is specified, the SVG animation is generated using [jmotion](https://github.com/7131/jmotion)&apos;s default simulator.
This application accepts vanilla, multiplex, and synchronous patterns.

There are already simulators that output GIF animations, but this may be the first simulator that outputs SVG animations.
File sizes are sometimes larger for GIFs and sometimes larger for SVGs.

Since SVG animations are simply text files, they have the advantage that they can be manually modified after file output.
On the other hand, displaying SVG animations on smartphones and other devices may require a dedicated application.

# How to use

You can copy the SVG source code displayed on the page and paste it into the &lt;body&gt; tag of your HTML file.

```HTML
<body>
<svg id="pattern_3" xmlns="http://www.w3.org/2000/svg" viewBox="-150 -255 300 300">
...
</svg>
</body>
```

Or you can download it as a file (e.g. pattern_3.svg) and refer to it from the &lt;img&gt; tag.

```HTML
<body>
<img src="./pattern_3.svg">
</body>
```

This application also accepts URL parameters.
? followed by a valid siteswap, the page will be displayed with that animation generated.
The following example specifies 441.

https://7131.github.io/jportable/?441
