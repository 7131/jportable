// Controller class
const Controller = function() {
    window.addEventListener("load", this._initialize.bind(this));
}

// Controller prototype
Controller.prototype = {

    // initialize the page
    "_initialize": function(e) {
        this._creator = new AnimCreator();

        // elements
        this._animation = document.getElementById("animation");
        this._svgSource = this._animation.innerHTML;
        this._parent = document.createElement("div");
        this._sourceArea = document.getElementById("source");
        const createButton = document.getElementById("create");
        const clipboardButton = document.getElementById("clipboard");
        const downloadButton = document.getElementById("download");

        // events
        createButton.addEventListener("click", this._create.bind(this));
        clipboardButton.addEventListener("click", this._copy.bind(this));
        downloadButton.addEventListener("click", this._download.bind(this));

        // get the query string
        const params = new URLSearchParams(window.location.search);
        if (0 < params.size) {
            document.getElementById("pattern").value = params.keys().next().value;
            this._create(e);
        }
    },

    // create an SVG image
    "_create": function(e) {
        // get the input value
        const text = document.getElementById("pattern").value;
        const message = document.getElementById("message");
        message.innerHTML = "";
        this._animation.innerHTML = this._svgSource;
        this._sourceArea.innerHTML = "";

        // create an SVG element
        this._parent.innerHTML = this._svgSource;
        const svg = this._parent.querySelector("svg");
        if (!svg || !text) {
            message.innerHTML = "No data for animation.";
            return;
        }

        // analyze
        const result = jmotion.Siteswap.analyze(text);
        if (!result.valid) {
            message.innerHTML = result.message;
            return;
        }

        // set to SVG
        svg.id = `pattern_${result.text}`;
        svg.setAttribute("xmlns", svg.namespaceURI);
        const core = new SvgCore(svg);
        this._creator.setId(svg.id);
        const motions = [ this._creator.paths.right, this._creator.paths.left ].flat();
        motions.forEach(elem => core.defs.appendChild(elem[0]));

        // set the animation
        const table = jmotion.Siteswap.separate(result.throws, result.sync);
        const orbits = this._creator.calculateOrbits(table, result.sync);
        core.animate(orbits);
        core.setScale(this._creator.getScale());
        core.setStyle({ "stroke-width": this._creator.getWidth() });

        // show
        this._animation.innerHTML = svg.outerHTML;
        const xml = svg.outerHTML.replace(/>\s+/g, ">");
        const arrange = xml.replace(/<\/\w+>/g, "$&\n").replace(/><([^\/])/g, ">\n<$1");
        this._sourceArea.appendChild(document.createTextNode(arrange));
    },

    // copy to clipboard
    "_copy": function(e) {
        window.navigator.clipboard.writeText(this._sourceArea.textContent);
    },

    // download as file
    "_download": function(e) {
        if (!this._animation.firstChild) {
            // no source code
            return;
        }

        // get the blob string.
        const blob = new Blob([ this._sourceArea.innerText ], { "type": "text/plain" });
        const url = URL.createObjectURL(blob);

        // link for download
        const link = document.createElement("a");
        link.href = url;
        link.download = `${this._animation.firstChild.id}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    },

}

// start the controller
new Controller();

